import { ItemStatus, PartItem } from '../types';
export interface OrderInput {
    partId: string;
    machineId: string;
    quantity: number;
}

export interface OrderPipeline {
    execute(input: OrderInput): Promise<PartItem[]>;
}
import { db } from '../../../shared/db';
import { partItems, statusHistory } from '../../../shared/db/schema';
import { StorageLogisticsService } from '../services/StorageLogisticsService';

export class OrderPipelineImpl implements OrderPipeline {
    async execute(input: OrderInput): Promise<PartItem[]> {
        return await db.transaction(async (tx) => {
            // 1. 空きBoxの確保
            const boxIds = await StorageLogisticsService.allocateBoxes(tx, input.quantity);

            // 2. PartItem の生成 (一括挿入)
            const newItems = [];
            for (let i = 0; i < input.quantity; i++) {
                newItems.push({
                    partId: input.partId,
                    machineId: input.machineId,
                    boxId: boxIds[i],
                    status: ItemStatus.READY,
                });
            }

            const insertedItems = await tx.insert(partItems)
                .values(newItems)
                .returning();

            // 3. 履歴の初期記録 (一括挿入)
            const histories = insertedItems.map((item: any) => ({
                partItemId: item.id,
                statusFrom: null,
                statusTo: ItemStatus.READY,
                reasonCode: null,
                comment: 'Initial manufacturing order',
            }));

            await tx.insert(statusHistory).values(histories);

            return insertedItems as any[] as PartItem[];
        });
    }
}
