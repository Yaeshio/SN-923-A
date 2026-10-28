import { db } from '../../../shared/db';
import { partItems, statusHistory, boxes } from '../../../shared/db/schema';
import { ItemStatus, ReasonCode } from '../types';
import { InvalidTransitionError, NotFoundError } from '../../../shared/errors';
import { eq } from 'drizzle-orm';

/**
 * 状態遷移図 (SN-923-stats.md) に基づく遷移ルール
 */
const ALLOWED_TRANSITIONS: Record<ItemStatus, ItemStatus[]> = {
    [ItemStatus.READY]: [ItemStatus.PRINTING, ItemStatus.CANCELLED, ItemStatus.DISCARD],
    [ItemStatus.PRINTING]: [ItemStatus.CUTTING, ItemStatus.DISCARD],
    [ItemStatus.CUTTING]: [ItemStatus.SANDING, ItemStatus.PRINTING, ItemStatus.DISCARD],
    [ItemStatus.SANDING]: [ItemStatus.INSPECTION, ItemStatus.CUTTING, ItemStatus.DISCARD],
    [ItemStatus.INSPECTION]: [ItemStatus.COMPLETED, ItemStatus.SANDING, ItemStatus.DISCARD],
    [ItemStatus.COMPLETED]: [ItemStatus.SHIPPED, ItemStatus.INSPECTION, ItemStatus.DISCARD],
    [ItemStatus.SHIPPED]: [ItemStatus.COMPLETED], // リカバリ
    [ItemStatus.DISCARD]: [ItemStatus.READY], // リカバリ
    [ItemStatus.CANCELLED]: [ItemStatus.READY], // リカバリ用（必要に応じて）
};

export class PartItemService {
    /**
     * ステータス遷移が可能かチェックする
     */
    static validateTransition(currentStatus: ItemStatus, nextStatus: ItemStatus) {
        const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
        if (!allowed.includes(nextStatus)) {
            throw new InvalidTransitionError(
                `Invalid transition: ${currentStatus} -> ${nextStatus}`
            );
        }
    }

    /**
     * 個体のステータスを更新し、履歴を記録する (トランザクション内での使用を想定)
     */
    static async updateStatus(
        tx: any,
        itemId: string,
        newStatus: ItemStatus,
        reasonCode?: ReasonCode,
        comment?: string
    ) {
        const item = await tx.query.partItems.findFirst({
            where: eq(partItems.id, itemId),
        });

        if (!item) {
            throw new NotFoundError(`PartItem not found: ${itemId}`);
        }

        const currentStatus = item.status as ItemStatus;

        // 1. バリデーション
        this.validateTransition(currentStatus, newStatus);

        // 2. ステータス更新
        await tx.update(partItems)
            .set({ 
                status: newStatus,
                updatedAt: new Date()
            })
            .where(eq(partItems.id, itemId));

        // 3. 履歴記録
        await tx.insert(statusHistory).values({
            partItemId: itemId,
            statusFrom: currentStatus,
            statusTo: newStatus,
            reasonCode: reasonCode,
            comment: comment,
            changedAt: new Date(),
        });

        return { ...item, status: newStatus };
    }
}
