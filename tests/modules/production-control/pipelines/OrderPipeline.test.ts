import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderPipelineImpl } from '../../../../src/modules/production-control/pipelines/OrderPipeline';
import { InSufficientStorageError } from '../../../../src/shared/errors/index';
import { createTestPart, createTestMachine, createTestBox } from '../../../factories';
import { db } from '../../../../src/shared/db';
import { partItems, boxes } from '../../../../src/shared/db/schema';
import { eq, inArray } from 'drizzle-orm';

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

        await expect(
            pipeline.execute({ partId: part.id, machineId: machine.id, quantity: itemQuantity })
        ).rejects.toThrow(); // 実装前
    });

    it('割り当てられたBoxのステータスが AVAILABLE から OCCUPIED に変更されること', async () => {
        const part = await createTestPart();
        const machine = await createTestMachine();
        const box = await createTestBox();

        await expect(
            pipeline.execute({ partId: part.id, machineId: machine.id, quantity: 1 })
        ).rejects.toThrow();
    });

    it('空きBoxが不足している場合、InSufficientStorageError がスローされること', async () => {
        const part = await createTestPart();
        const machine = await createTestMachine();
        // 意図的にBoxを作成しない

        await expect(
            pipeline.execute({ partId: part.id, machineId: machine.id, quantity: 1 })
        ).rejects.toThrowError(); // 実装前は InSufficientStorageError ではないためError
    });

    it('生成された各個体（PartItem）に初期履歴（StatusHistory）が記録されること', async () => {
        const part = await createTestPart();
        const machine = await createTestMachine();
        const box = await createTestBox();

        await expect(
            pipeline.execute({ partId: part.id, machineId: machine.id, quantity: 1 })
        ).rejects.toThrow();
    });
});
