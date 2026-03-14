import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderPipelineImpl } from '../../../../src/modules/production-control/pipelines/OrderPipeline';
import { InSufficientStorageError } from '../../../../src/shared/errors/index';
import { createTestPart, createTestMachine, createTestBox } from '../../../factories';
import { db } from '../../../../src/shared/db';
import { partItems, boxes, statusHistory } from '../../../../src/shared/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { ItemStatus } from '../../../../src/modules/production-control/types';

describe('OrderPipeline', () => {
    let pipeline: OrderPipelineImpl;

    beforeEach(() => {
        vi.clearAllMocks();
        pipeline = new OrderPipelineImpl();
    });

    it('指定した数量のPartItemが生成され、空きBoxが割り当てられること', async () => {
        const itemQuantity = 2;
        const part = await createTestPart();
        const machine = await createTestMachine();
        const box1 = await createTestBox();
        const box2 = await createTestBox();

        await pipeline.execute({ partId: part.id, machineId: machine.id, quantity: itemQuantity });

        const items = await db.query.partItems.findMany({
            where: eq(partItems.partId, part.id),
        });
        expect(items).toHaveLength(itemQuantity);
        expect(items[0].boxId).not.toBeNull();
        expect(items[1].boxId).not.toBeNull();
    });

    it('割り当てられたBoxのステータスが AVAILABLE から OCCUPIED に変更されること', async () => {
        const part = await createTestPart();
        const machine = await createTestMachine();
        const box = await createTestBox();

        await pipeline.execute({ partId: part.id, machineId: machine.id, quantity: 1 });

        const updatedBox = await db.query.boxes.findFirst({
            where: eq(boxes.id, box.id),
        });
        expect(updatedBox?.status).toBe('OCCUPIED');
    });

    it('空きBoxが不足している場合、InSufficientStorageError がスローされること', async () => {
        const part = await createTestPart();
        const machine = await createTestMachine();
        // 意図的にBoxを作成しない

        await expect(
            pipeline.execute({ partId: part.id, machineId: machine.id, quantity: 1 })
        ).rejects.toThrow(InSufficientStorageError);
    });

    it('生成された各個体（PartItem）に初期履歴（StatusHistory）が記録されること', async () => {
        const part = await createTestPart();
        const machine = await createTestMachine();
        const box = await createTestBox();

        const items = await pipeline.execute({ partId: part.id, machineId: machine.id, quantity: 1 });
        const itemId = items[0].id;

        const history = await db.query.statusHistory.findFirst({
            where: eq(statusHistory.partItemId, itemId),
        });
        expect(history?.statusFrom).toBeNull();
        expect(history?.statusTo).toBe(ItemStatus.READY);
    });
});
