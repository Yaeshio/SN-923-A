import { db } from '../../../shared/db';
import { boxes } from '../../../shared/db/schema';
import { InSufficientStorageError } from '../../../shared/errors';
import { eq, and, asc, inArray } from 'drizzle-orm';

export class StorageLogisticsService {
    /**
     * 単一の空きBoxを確保する
     */
    static async allocateBox(tx: any): Promise<string> {
        const ids = await this.allocateBoxes(tx, 1);
        return ids[0];
    }

    /**
     * 指定された数量の空きBoxを確保する (トランザクション内)
     */
    static async allocateBoxes(tx: any, quantity: number): Promise<string[]> {
        // SELECT FOR UPDATE を使用して競合を防止
        // 最小IDから順に取得
        const availableBoxes = await tx.query.boxes.findMany({
            where: eq(boxes.status, 'AVAILABLE'),
            orderBy: [asc(boxes.id)],
            limit: quantity,
        });

        if (availableBoxes.length < quantity) {
            throw new InSufficientStorageError('空きBoxが不足しています。');
        }

        const boxIds = availableBoxes.map((b: any) => b.id);

        // ステータスを更新
        await tx.update(boxes)
            .set({ status: 'OCCUPIED' })
            .where(inArray(boxes.id, boxIds));

        return boxIds;
    }

    /**
     * Boxを解放する (トランザクション内)
     */
    static async releaseBox(tx: any, boxId: string) {
        if (!boxId) return;

        await tx.update(boxes)
            .set({ status: 'AVAILABLE' })
            .where(eq(boxes.id, boxId));
    }
}
