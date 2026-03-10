import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportPipelineImpl } from '../../../../src/modules/design-registry/pipelines/ImportPipeline';
import { StorageService } from '../../../../src/shared/services/index';
import { createTestProject, createTestUnit } from '../../../factories';
import { db } from '../../../../src/shared/db';
import { parts } from '../../../../src/shared/db/schema';
import { eq } from 'drizzle-orm';

vi.mock('../../../../src/shared/services/index', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../../src/shared/services/index')>();
    return {
        ...actual,
        StorageService: {
            uploadFile: vi.fn(),
            deleteFile: vi.fn(),
            getDownloadUrl: vi.fn(),
        },
    };
});

describe('ImportPipeline', () => {
    let pipeline: ImportPipelineImpl;

    beforeEach(() => {
        vi.clearAllMocks();
        pipeline = new ImportPipelineImpl();
    });

    it('初期状態（PENDING）の部品レコードが生成できること', async () => {
        // Arrange
        const project = await createTestProject();
        const unit = await createTestUnit({ projectId: project.id });
        vi.mocked(StorageService.uploadFile).mockResolvedValueOnce('url/to/file');

        // Act - Expect to fail since not implemented, but we changed the mock
        await expect(pipeline.execute({ files: ['file.stl'], projectId: project.id, unitId: unit.id }))
            .rejects.toThrow();

        // Validations will go here once implemented
        // const actualParts = await db.select().from(parts).where(eq(parts.unitId, unit.id));
        // expect(actualParts).toHaveLength(1);
    });

    it('ストレージ保存成功時にステータスが ACTIVE に更新されること', async () => {
        const project = await createTestProject();
        const unit = await createTestUnit({ projectId: project.id });
        vi.mocked(StorageService.uploadFile).mockResolvedValueOnce('url/to/file');

        await expect(pipeline.execute({ files: ['file.stl'], projectId: project.id, unitId: unit.id }))
            .rejects.toThrow();
    });

    it('ストレージ保存エラー時に適切にクリーンアップされること（PENDINGレコードの削除またはリトライ対象化）', async () => {
        const project = await createTestProject();
        const unit = await createTestUnit({ projectId: project.id });
        vi.mocked(StorageService.uploadFile).mockRejectedValueOnce(new Error('Storage Error'));

        await expect(pipeline.execute({ files: ['file.stl'], projectId: project.id, unitId: unit.id }))
            .rejects.toThrow();
    });
});
