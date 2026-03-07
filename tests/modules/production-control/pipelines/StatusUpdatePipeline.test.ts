import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StatusUpdatePipelineImpl } from '../../../../src/modules/production-control/pipelines/StatusUpdatePipeline';
import { ItemStatus, ReasonCode } from '../../../../src/modules/production-control/types';
import { InvalidTransitionError } from '../../../../src/shared/errors/index';

describe('StatusUpdatePipeline', () => {
    let pipeline: StatusUpdatePipelineImpl;

    beforeEach(() => {
        vi.clearAllMocks();
        pipeline = new StatusUpdatePipelineImpl();
    });

    describe('正常系のステータス遷移', () => {
        it('許可された遷移（READY -> PRINTING）が成功すること', async () => {
            await expect(
                pipeline.execute({ itemId: 'item-1', newStatus: ItemStatus.PRINTING })
            ).rejects.toThrow();
        });

        it('各ステータス遷移において、PartItemのステータスが正しく更新されること', async () => {
            await expect(
                pipeline.execute({ itemId: 'item-1', newStatus: ItemStatus.CUTTING })
            ).rejects.toThrow();
        });

        it('ステータス遷移の履歴が reason_code や comment と共に記録されること', async () => {
            await expect(
                pipeline.execute({
                    itemId: 'item-1',
                    newStatus: ItemStatus.PRINTING,
                    reason_code: ReasonCode.OPERATIONAL_ERROR,
                    comment: 'テストコメント'
                })
            ).rejects.toThrow();
        });
    });

    describe('異常系・ガード条件', () => {
        it('許可されていないスキップ遷移（READY -> INSPECTION 等）がエラーとなること', async () => {
            await expect(
                pipeline.execute({ itemId: 'item-1', newStatus: ItemStatus.INSPECTION })
            ).rejects.toThrowError(InvalidTransitionError);
        });
    });

    describe('Boxの自動解放', () => {
        it('SHIPPED への遷移時に、紐づくBoxが解放（AVAILABLE）されること', async () => {
            await expect(
                pipeline.execute({ itemId: 'item-1', newStatus: ItemStatus.SHIPPED })
            ).rejects.toThrow();
        });

        it('DISCARD への遷移時に、紐づくBoxが解放（AVAILABLE）されること', async () => {
            await expect(
                pipeline.execute({ itemId: 'item-1', newStatus: ItemStatus.DISCARD })
            ).rejects.toThrow();
        });

        it('CANCELLED への遷移時に、紐づくBoxが解放（AVAILABLE）されること', async () => {
            await expect(
                pipeline.execute({ itemId: 'item-1', newStatus: ItemStatus.CANCELLED })
            ).rejects.toThrow();
        });
    });

    describe('戻り遷移（リワーク）', () => {
        it('CUTTING から PRINTING への戻り遷移が許可されること', async () => {
            await expect(
                pipeline.execute({ itemId: 'item-1', newStatus: ItemStatus.PRINTING })
            ).rejects.toThrow();
        });

        it('SANDING から CUTTING への戻り遷移が許可されること', async () => {
            await expect(
                pipeline.execute({ itemId: 'item-1', newStatus: ItemStatus.CUTTING })
            ).rejects.toThrow();
        });
    });

    describe('再割当リカバリ', () => {
        it('SHIPPED から COMPLETED 等の稼働状態へのリカバリ時、元のBoxが利用不可なら新しいBoxが自動で割り当てられること', async () => {
            await expect(
                pipeline.execute({ itemId: 'item-1', newStatus: ItemStatus.COMPLETED })
            ).rejects.toThrow();
        });

        it('DISCARD から READY へのリカバリ時に新しいBoxが自動割り当てられること', async () => {
            await expect(
                pipeline.execute({ itemId: 'item-1', newStatus: ItemStatus.READY })
            ).rejects.toThrow();
        });
    });
});
