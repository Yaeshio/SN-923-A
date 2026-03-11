import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StatusUpdatePipelineImpl } from '../../../../src/modules/production-control/pipelines/StatusUpdatePipeline';
import { InvalidTransitionError } from '../../../../src/shared/errors/index';
import { createTestPartItem, createTestBox } from '../../../factories';
import { db } from '../../../../src/shared/db';
import { partItems, statusHistory, boxes } from '../../../../src/shared/db/schema';
import { eq } from 'drizzle-orm';
import { ItemStatus, ReasonCode } from '../../../../src/modules/production-control/types';

describe('StatusUpdatePipeline', () => {
    let pipeline: StatusUpdatePipelineImpl;

    beforeEach(async () => {
        vi.clearAllMocks();
        pipeline = new StatusUpdatePipelineImpl();
    });

    describe('正常系のステータス遷移', () => {
        it('許可された遷移（READY -> PRINTING）が成功すること', async () => {
            const item = await createTestPartItem({ status: ItemStatus.READY });
            
            await pipeline.execute({ itemId: item.id, newStatus: ItemStatus.PRINTING });

            const updatedItem = await db.query.partItems.findFirst({
                where: eq(partItems.id, item.id),
            });
            expect(updatedItem?.status).toBe(ItemStatus.PRINTING);
        });

        it('ステータス遷移の履歴が reason_code や comment と共に記録されること', async () => {
            const item = await createTestPartItem({ status: ItemStatus.READY });
            
            await pipeline.execute({
                itemId: item.id,
                newStatus: ItemStatus.PRINTING,
                reason_code: ReasonCode.OPERATIONAL_ERROR,
                comment: 'テストコメント'
            });

            const history = await db.query.statusHistory.findFirst({
                where: eq(statusHistory.partItemId, item.id),
            });
            expect(history?.statusFrom).toBe(ItemStatus.READY);
            expect(history?.statusTo).toBe(ItemStatus.PRINTING);
            expect(history?.reasonCode).toBe(ReasonCode.OPERATIONAL_ERROR);
            expect(history?.comment).toBe('テストコメント');
        });
    });

    describe('異常系・ガード条件', () => {
        it('許可されていないスキップ遷移（READY -> INSPECTION 等）がエラーとなること', async () => {
            const item = await createTestPartItem({ status: ItemStatus.READY });
            
            await expect(
                pipeline.execute({ itemId: item.id, newStatus: ItemStatus.INSPECTION })
            ).rejects.toThrow(InvalidTransitionError);
        });
    });

    describe('Boxの自動解放', () => {
        it('SHIPPED への遷移時に、紐づくBoxが解放（AVAILABLE）されること', async () => {
            const box = await createTestBox({ status: 'OCCUPIED' });
            const item = await createTestPartItem({ status: ItemStatus.COMPLETED, boxId: box.id });
            
            await pipeline.execute({ itemId: item.id, newStatus: ItemStatus.SHIPPED });

            const updatedBox = await db.query.boxes.findFirst({
                where: eq(boxes.id, box.id),
            });
            expect(updatedBox?.status).toBe('AVAILABLE');
        });
    });

    describe('戻り遷移（リワーク）', () => {
        it('CUTTING から PRINTING への戻り遷移が許可されること', async () => {
            const item = await createTestPartItem({ status: ItemStatus.CUTTING });
            
            await pipeline.execute({ itemId: item.id, newStatus: ItemStatus.PRINTING });

            const updatedItem = await db.query.partItems.findFirst({
                where: eq(partItems.id, item.id),
            });
            expect(updatedItem?.status).toBe(ItemStatus.PRINTING);
        });
    });

    describe('再割当リカバリ', () => {
        it('SHIPPED から COMPLETED 等の稼働状態へのリカバリ時、新しいBoxが自動で割り当てられること', async () => {
            // SHIPPED状態のアイテム（通常Boxは解放済み）
            const item = await createTestPartItem({ status: ItemStatus.SHIPPED, boxId: null });
            
            // 空きBOXを用意
            const newBox = await createTestBox({ status: 'AVAILABLE' });

            await pipeline.execute({ itemId: item.id, newStatus: ItemStatus.COMPLETED });

            const updatedItem = await db.query.partItems.findFirst({
                where: eq(partItems.id, item.id),
            });
            expect(updatedItem?.status).toBe(ItemStatus.COMPLETED);
            expect(updatedItem?.boxId).not.toBeNull();
        });
    });
});
