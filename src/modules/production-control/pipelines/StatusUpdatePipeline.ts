import { ItemStatus, PartItem } from '../types';
import { db } from '../../../shared/db';
import { PartItemService } from '../services/PartItemService';
import { StorageLogisticsService } from '../services/StorageLogisticsService';
import { partItems } from '../../../shared/db/schema';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '../../../shared/errors';

export interface StatusUpdateInput {
    itemId: string;
    newStatus: ItemStatus;
    reason_code?: any; // ReasonCode;
    comment?: string;
}

export interface StatusUpdatePipeline {
    execute(input: StatusUpdateInput): Promise<PartItem>;
}

export class StatusUpdatePipelineImpl implements StatusUpdatePipeline {
    async execute(input: StatusUpdateInput): Promise<PartItem> {
        return await db.transaction(async (tx) => {
            // 1. Get current item state
            const item = await tx.query.partItems.findFirst({
                where: eq(partItems.id, input.itemId),
            });

            if (!item) {
                throw new NotFoundError(`Item not found: ${input.itemId}`);
            }

            // 2. Resource management (Release Box if appropriate)
            const boxReleasingStatuses: ItemStatus[] = [
                ItemStatus.SHIPPED,
                ItemStatus.DISCARD,
                ItemStatus.CANCELLED
            ];

            if (boxReleasingStatuses.includes(input.newStatus) && item.boxId) {
                await StorageLogisticsService.releaseBox(tx, item.boxId);
                // Also clear boxId on the item
                await tx.update(partItems)
                    .set({ boxId: null })
                    .where(eq(partItems.id, item.id));
            }

            // 3. Resource management (Re-allocate Box for recovery if needed)
            // If moving from a "released" status back to a "stored" status
            const wasReleased = boxReleasingStatuses.includes(item.status as ItemStatus);
            const isStoring = !boxReleasingStatuses.includes(input.newStatus);
            
            if (wasReleased && isStoring && !item.boxId) {
                const newBoxId = await StorageLogisticsService.allocateBox(tx);
                await tx.update(partItems)
                    .set({ boxId: newBoxId })
                    .where(eq(partItems.id, item.id));
            }

            // 4. Update status and record history via Service
            await PartItemService.updateStatus(
                tx,
                input.itemId,
                input.newStatus,
                input.reason_code,
                input.comment
            );

            // Fetch final full object to match interface
            const finalItem = await tx.query.partItems.findFirst({
                where: eq(partItems.id, input.itemId),
            });

            return finalItem as any as PartItem;
        });
    }
}
