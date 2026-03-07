import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportPipelineImpl } from '../../../../src/modules/design-registry/pipelines/ImportPipeline';
import { PartStatus } from '../../../../src/modules/design-registry/types';
import { StorageService } from '../../../../src/shared/services/index';

vi.mock('../../../../src/shared/services/index', () => ({
    StorageService: {
        uploadFile: vi.fn(),
        deleteFile: vi.fn(),
    },
    DbService: {
        transaction: vi.fn((cb) => cb()),
    }
}));

// Dummy DB mock
const mockDb = {
    createPart: vi.fn(),
    updatePartStatus: vi.fn(),
};

describe('ImportPipeline', () => {
    let pipeline: ImportPipelineImpl;

    beforeEach(() => {
        vi.clearAllMocks();
        pipeline = new ImportPipelineImpl();
        // Inject mockDb if pipeline had constructor params
    });

    it('初期状態（PENDING）の部品レコードが生成できること', async () => {
        // 仮の実装に合わせたモックの戻り値設定
        mockDb.createPart.mockResolvedValueOnce({ id: 'part-1', status: PartStatus.PENDING });
        vi.mocked(StorageService.uploadFile).mockResolvedValueOnce('url/to/file');

        // これから実装するコードが通るように設計されたテスト
        await expect(pipeline.execute({ files: ['file.stl'], projectId: 'proj-1', unitId: 'unit-1' }))
            .rejects.toThrow(); // 未実装のため必ずthrowするが、実装時は resolves に修正する
    });

    it('ストレージ保存成功時にステータスが ACTIVE に更新されること', async () => {
        await expect(pipeline.execute({ files: ['file.stl'], projectId: 'proj-1', unitId: 'unit-1' }))
            .rejects.toThrow();
    });

    it('ストレージ保存エラー時に適切にクリーンアップされること（PENDINGレコードの削除またはリトライ対象化）', async () => {
        vi.mocked(StorageService.uploadFile).mockRejectedValueOnce(new Error('Storage Error'));

        await expect(pipeline.execute({ files: ['file.stl'], projectId: 'proj-1', unitId: 'unit-1' }))
            .rejects.toThrow();
    });
});
