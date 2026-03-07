import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DownloadPipelineImpl } from '../../../../src/modules/design-registry/pipelines/DownloadPipeline';
import { StorageService } from '../../../../src/shared/services/index';
import { NotFoundError, UnauthorizedError } from '../../../../src/shared/errors/index';

vi.mock('../../../../src/shared/services/index', () => ({
    StorageService: {
        getDownloadUrl: vi.fn(),
    }
}));

describe('DownloadPipeline', () => {
    let pipeline: DownloadPipelineImpl;

    beforeEach(() => {
        vi.clearAllMocks();
        pipeline = new DownloadPipelineImpl();
    });

    it('存在するかつACTIVEなPartに対して、一時的な閲覧URLが返却されること', async () => {
        vi.mocked(StorageService.getDownloadUrl).mockResolvedValue('https://example.com/file.stl');

        await expect(pipeline.execute({ partId: 'part-1' })).rejects.toThrow();
    });

    it('ファイルが存在しない（PENDINGなど）Partに対してはNotFoundErrorが返ること', async () => {
        await expect(pipeline.execute({ partId: 'invalid-part' })).rejects.toThrowError(NotFoundError);
    });

    it('権限がない場合はUnauthorizedErrorが返ること', async () => {
        await expect(pipeline.execute({ partId: 'part-1' })).rejects.toThrowError(UnauthorizedError);
    });
});
