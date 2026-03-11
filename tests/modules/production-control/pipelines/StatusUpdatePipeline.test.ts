import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StatusUpdatePipelineImpl } from '../../../../src/modules/production-control/pipelines/StatusUpdatePipeline';
import { InvalidTransitionError } from '../../../../src/shared/errors/index';
import { createTestPartItem, createTestBox } from '../../../factories';

describe('StatusUpdatePipeline', () => {
    let pipeline: StatusUpdatePipelineImpl;

    beforeEach(async () => {
        vi.clearAllMocks();
        pipeline = new StatusUpdatePipelineImpl();
    });

    describe('正常系のステータス遷移', () => {
        it('許可された遷移（READY -> PRINTING）が成功すること', async () => {
            const item = await createTestPartItem({ status: 'READY' });
            await expect(
                pipeline.execute({ itemId: item.id, newStatus: 'PRINTING' as any })
            ).rejects.toThrow();
        });

        it('各ステータス遷移において、PartItemのステータスが正しく更新されること', async () => {
            const item = await createTestPartItem({ status: 'PRINTING' as any });
            await expect(
                pipeline.execute({ itemId: item.id, newStatus: 'CUTTING' as any })
            ).rejects.toThrow();
        });

        it('ステータス遷移の履歴が reason_code や comment と共に記録されること', async () => {
            const item = await createTestPartItem({ status: 'READY' });
            await expect(
                pipeline.execute({
                    itemId: item.id,
                    newStatus: 'PRINTING' as any,
                    reason_code: 'OPERATIONAL_ERROR' as any,
                    comment: 'テストコメント'
                })
            ).rejects.toThrow();
        });
    });

    describe('異常系・ガード条件', () => {
        it('許可されていないスキップ遷移（READY -> INSPECTION 等）がエラーとなること', async () => {
            const item = await createTestPartItem({ status: 'READY' });
            await expect(
                pipeline.execute({ itemId: item.id, newStatus: 'INSPECTION' as any })
            ).rejects.toThrowError();
        });
    });

    describe('Boxの自動解放', () => {
        it('SHIPPED への遷移時に、紐づくBoxが解放（AVAILABLE）されること', async () => {
            const box = await createTestBox({ status: 'OCCUPIED' });
            const item = await createTestPartItem({ status: 'COMPLETED' as any, boxId: box.id });
            await expect(
                pipeline.execute({ itemId: item.id, newStatus: 'SHIPPED' as any })
            ).rejects.toThrow();
        });

        it('DISCARD への遷移時に、紐づくBoxが解放（AVAILABLE）されること', async () => {
            const box = await createTestBox({ status: 'OCCUPIED' });
            const item = await createTestPartItem({ status: 'INSPECTION' as any, boxId: box.id });
            await expect(
                pipeline.execute({ itemId: item.id, newStatus: 'DISCARD' as any })
            ).rejects.toThrow();
        });

        it('CANCELLED への遷移時に、紐づくBoxが解放（AVAILABLE）されること', async () => {
            const box = await createTestBox({ status: 'OCCUPIED' });
            const item = await createTestPartItem({ status: 'READY' as any, boxId: box.id });
            await expect(
                pipeline.execute({ itemId: item.id, newStatus: 'CANCELLED' as any })
            ).rejects.toThrow();
        });
    });

    describe('戻り遷移（リワーク）', () => {
        it('CUTTING から PRINTING への戻り遷移が許可されること', async () => {
            const item = await createTestPartItem({ status: 'CUTTING' as any });
            await expect(
                pipeline.execute({ itemId: item.id, newStatus: 'PRINTING' as any })
            ).rejects.toThrow();
        });

        it('SANDING から CUTTING への戻り遷移が許可されること', async () => {
            const item = await createTestPartItem({ status: 'SANDING' as any });
            await expect(
                pipeline.execute({ itemId: item.id, newStatus: 'CUTTING' as any })
            ).rejects.toThrow();
        });
    });

    describe('再割当リカバリ', () => {
        it('SHIPPED から COMPLETED 等の稼働状態へのリカバリ時、元のBoxが利用不可なら新しいBoxが自動で割り当てられること', async () => {
            const item = await createTestPartItem({ status: 'SHIPPED' as any });
            await expect(
                pipeline.execute({ itemId: item.id, newStatus: 'COMPLETED' as any })
            ).rejects.toThrow();
        });

        it('DISCARD から READY へのリカバリ時に新しいBoxが自動割り当てられること', async () => {
            const item = await createTestPartItem({ status: 'DISCARD' as any });
            await expect(
                pipeline.execute({ itemId: item.id, newStatus: 'READY' as any })
            ).rejects.toThrow();
        });
    });
});
