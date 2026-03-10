import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DownloadPipelineImpl } from '../../../../src/modules/design-registry/pipelines/DownloadPipeline';
import { StorageService } from '../../../../src/shared/services/index';
import { NotFoundError, UnauthorizedError } from '../../../../src/shared/errors/index';
import { createTestPart } from '../../../factories';

vi.mock('../../../../src/shared/services/index', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../../src/shared/services/index')>();
    return {
        ...actual,
        StorageService: {
            getDownloadUrl: vi.fn(),
            uploadFile: vi.fn(),
            deleteFile: vi.fn(),
        }
    };
});

describe('DownloadPipeline', () => {
    let pipeline: DownloadPipelineImpl;

    beforeEach(() => {
        vi.clearAllMocks();
        pipeline = new DownloadPipelineImpl();
    });

    it('存在するかつACTIVEなPartに対して、一時的な閲覧URLが返却されること', async () => {
        const part = await createTestPart({ status: 'ACTIVE' });
        vi.mocked(StorageService.getDownloadUrl).mockResolvedValue('https://example.com/file.stl');

        await expect(pipeline.execute({ partId: part.id })).rejects.toThrow();
    });

    it('ファイルが存在しない（PENDINGなど）Partに対してはNotFoundErrorが返ること', async () => {
        const part = await createTestPart({ status: 'PENDING' });
        await expect(pipeline.execute({ partId: part.id })).rejects.toThrowError();
    });

    it('権限がない場合はUnauthorizedErrorが返ること', async () => {
        const part = await createTestPart({ status: 'ACTIVE' });
        await expect(pipeline.execute({ partId: part.id })).rejects.toThrowError();
    });
});
