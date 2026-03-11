import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportPipelineImpl } from '../../../../src/modules/design-registry/pipelines/ImportPipeline';
import { StorageService } from '../../../../src/shared/services/index';
import { createTestProject, createTestUnit } from '../../../factories';
import { db } from '../../../../src/shared/db';
import { parts } from '../../../../src/shared/db/schema';
import { eq } from 'drizzle-orm';
import { PartStatus } from '../../../../src/modules/design-registry/types';

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

    it('一連の処理が成功し、部品が ACTIVE ステータスで保存されること', async () => {
        // Arrange
        const project = await createTestProject();
        const unit = await createTestUnit({ projectId: project.id });
        vi.mocked(StorageService.uploadFile).mockResolvedValue('url/to/file');

        // Act
        const result = await pipeline.execute({ 
            files: [{ name: 'file.stl' } as any], 
            projectId: project.id, 
            unitId: unit.id 
        });

        // Assert
        expect(result[0].status).toBe(PartStatus.ACTIVE);
        expect(result[0].stlUrl).toBe('url/to/file');

        const dbPart = await db.query.parts.findFirst({
            where: eq(parts.id, result[0].id),
        });
        expect(dbPart?.status).toBe(PartStatus.ACTIVE);
    });

    it('ストレージ保存エラー時にレコードが適切にロールバック（削除）されること', async () => {
        // Arrange
        const project = await createTestProject();
        const unit = await createTestUnit({ projectId: project.id });
        vi.mocked(StorageService.uploadFile).mockRejectedValueOnce(new Error('Storage Error'));

        // Act & Assert
        await expect(pipeline.execute({ 
            files: [{ name: 'file.stl' } as any], 
            projectId: project.id, 
            unitId: unit.id 
        })).rejects.toThrow('Storage Error');

        const dbParts = await db.query.parts.findMany({
            where: eq(parts.unitId, unit.id),
        });
        expect(dbParts).toHaveLength(0);
    });
});
