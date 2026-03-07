import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderPipelineImpl } from '../../../../src/modules/production-control/pipelines/OrderPipeline';
import { InSufficientStorageError } from '../../../../src/shared/errors/index';

describe('OrderPipeline', () => {
    let pipeline: OrderPipelineImpl;

    beforeEach(() => {
        vi.clearAllMocks();
        pipeline = new OrderPipelineImpl();
    });

    it('指定した数量のPartItemが生成され、空きBoxが割り当てられること', async () => {
        await expect(
            pipeline.execute({ partId: 'part-1', machineId: 'machine-1', quantity: 2 })
        ).rejects.toThrow(); // 実装前
    });

    it('割り当てられたBoxのステータスが AVAILABLE から OCCUPIED に変更されること', async () => {
        await expect(
            pipeline.execute({ partId: 'part-1', machineId: 'machine-1', quantity: 1 })
        ).rejects.toThrow();
    });

    it('空きBoxが不足している場合、InSufficientStorageError がスローされること', async () => {
        // モックDBで空きBoxを0にする設定をここで行う想定
        await expect(
            pipeline.execute({ partId: 'part-1', machineId: 'machine-1', quantity: 10 })
        ).rejects.toThrowError(InSufficientStorageError); // 実装前は通常のErrorがthrowされるため失敗する
    });

    it('生成された各個体（PartItem）に初期履歴（StatusHistory）が記録されること', async () => {
        await expect(
            pipeline.execute({ partId: 'part-1', machineId: 'machine-1', quantity: 1 })
        ).rejects.toThrow();
    });
});
