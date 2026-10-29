import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DownloadPipelineImpl } from '../../../../src/modules/design-registry/pipelines/DownloadPipeline';
import { StorageService } from '../../../../src/shared/services';
import { NotFoundError } from '../../../../src/shared/errors';
import { createTestAssembly, createTestPart, createTestPartInstance } from '../../../factories';
import type { StorageFake } from '../../../utils/storage';

vi.mock('../../../../src/shared/services', async () => {
    const { createStorageFake } = await import('../../../utils/storage');
    return { StorageService: createStorageFake() };
});

const storage = StorageService as unknown as StorageFake;

describe('DownloadPipeline', () => {
    let pipeline: DownloadPipelineImpl;

    beforeEach(() => {
        storage.reset();
        pipeline = new DownloadPipelineImpl();
    });

    async function setup() {
        const assembly = await createTestAssembly();
        const { part, instance } = await createTestPart({ assemblyId: assembly.id, modelName: 'bracket' });
        return { assembly, part, instance, ctx: { userId: assembly.ownerId } };
    }

    it('partInstance を指定すると、そのインスタンスのパスから一時的な閲覧URLが返却されること', async () => {
        const { instance, ctx } = await setup();

        const url = await pipeline.execute({ kind: 'partInstance', id: instance.id }, ctx);

        expect(url).toContain(instance.instanceUrl);
        // ダウンロード名は「インスタンス名_rev{N}」+ アップロード時の拡張子
        expect(storage.getDownloadUrl).toHaveBeenCalledWith(instance.instanceUrl, 'bracket_rev1.stl');
    });

    it('part を指定すると、最新改訂のインスタンスに解決されること', async () => {
        const { part, ctx } = await setup();
        const rev2 = await createTestPartInstance({ partId: part.id, instanceUrl: 'test/instances/rev2.stl' });
        expect(rev2.revision).toBe(2);

        await pipeline.execute({ kind: 'part', id: part.id }, ctx);

        expect(storage.getDownloadUrl).toHaveBeenCalledWith('test/instances/rev2.stl', 'bracket_rev2.stl');
    });

    it('存在しない対象は NotFoundError となること', async () => {
        const { ctx } = await setup();
        const missing = '00000000-0000-4000-8000-000000000000';

        await expect(pipeline.execute({ kind: 'partInstance', id: missing }, ctx)).rejects.toThrow(NotFoundError);
        await expect(pipeline.execute({ kind: 'part', id: missing }, ctx)).rejects.toThrow(NotFoundError);
        await expect(pipeline.execute({ kind: 'part', id: 'not-a-uuid' }, ctx)).rejects.toThrow(NotFoundError);
        expect(storage.getDownloadUrl).not.toHaveBeenCalled();
    });

    it('他のユーザーのデータは NotFoundError となること (RLS)', async () => {
        const { part, instance } = await setup();
        const other = await createTestAssembly(); // 別の所有者
        const ctx = { userId: other.ownerId };

        await expect(pipeline.execute({ kind: 'partInstance', id: instance.id }, ctx)).rejects.toThrow(NotFoundError);
        await expect(pipeline.execute({ kind: 'part', id: part.id }, ctx)).rejects.toThrow(NotFoundError);
        expect(storage.getDownloadUrl).not.toHaveBeenCalled();
    });
});
