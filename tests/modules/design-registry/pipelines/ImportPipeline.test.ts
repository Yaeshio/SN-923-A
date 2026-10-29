import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportPipelineImpl, toStorageSafeName } from '../../../../src/modules/design-registry/pipelines/ImportPipeline';
import { StorageService } from '../../../../src/shared/services';
import { NotFoundError, ValidationError } from '../../../../src/shared/errors';
import { createTestAssembly } from '../../../factories';
import { db } from '../../../../src/shared/db';
import { assemblies, parts, partInstances } from '../../../../src/shared/db/schema';
import type { StorageFake } from '../../../utils/storage';

vi.mock('../../../../src/shared/services', async () => {
    const { createStorageFake } = await import('../../../utils/storage');
    return { StorageService: createStorageFake() };
});

const storage = StorageService as unknown as StorageFake;

const stl = (name: string) => new File(['solid test\nendsolid test\n'], name, { type: 'model/stl' });

describe('ImportPipeline', () => {
    let pipeline: ImportPipelineImpl;

    beforeEach(() => {
        storage.reset();
        pipeline = new ImportPipelineImpl();
    });

    async function setup() {
        const assembly = await createTestAssembly();
        return { assembly, ctx: { userId: assembly.ownerId } };
    }

    async function countRows() {
        return {
            parts: (await db.select().from(parts)).length,
            instances: (await db.select().from(partInstances)).length,
        };
    }

    it('ファイルごとにパーツと、改訂1の初期インスタンスが同時に作られること', async () => {
        const { assembly, ctx } = await setup();

        const result = await pipeline.execute(
            { assemblyId: assembly.id, files: [stl('bracket.stl'), stl('cover.STL')], partsQuantity: 3 },
            ctx,
        );

        expect(result).toHaveLength(2);
        const [first, second] = result;

        // パーツ: モデル名は拡張子を除いたファイル名、model_url は Storage の相対パス
        expect(first.part.modelName).toBe('bracket');
        expect(second.part.modelName).toBe('cover');
        expect(first.part.assemblyId).toBe(assembly.id);
        expect(first.part.partsQuantity).toBe(3);
        expect(first.part.modelUrl).toBe(`${ctx.userId}/parts/${first.part.id}/bracket.stl`);

        // 初期インスタンス: 改訂1、名前と URL は親パーツのコピー、change_note は NULL
        expect(first.instance.partId).toBe(first.part.id);
        expect(first.instance.revision).toBe(1);
        expect(first.instance.instanceName).toBe('bracket');
        expect(first.instance.instanceUrl).toBe(first.part.modelUrl);
        expect(first.instance.changeNote).toBeNull();

        // DB に永続化されていること
        expect(await countRows()).toEqual({ parts: 2, instances: 2 });
        expect(storage.uploaded).toEqual([first.part.modelUrl, second.part.modelUrl]);
    });

    it('必要数を省略すると 1 になること', async () => {
        const { assembly, ctx } = await setup();

        const [result] = await pipeline.execute({ assemblyId: assembly.id, files: [stl('a.stl')] }, ctx);

        expect(result.part.partsQuantity).toBe(1);
    });

    it('日本語などASCII以外のファイル名は、モデル名には残し、Storage のパスは安全な名前にすること', async () => {
        const { assembly, ctx } = await setup();

        const [result] = await pipeline.execute({ assemblyId: assembly.id, files: [stl('ブラケット 試作 v2.stl')] }, ctx);

        expect(result.part.modelName).toBe('ブラケット 試作 v2');
        expect(result.part.modelUrl).toBe(`${ctx.userId}/parts/${result.part.id}/v2.stl`);
        expect(toStorageSafeName('ブラケット.stl')).toBe('model.stl');
        expect(toStorageSafeName('my part (1).stl')).toBe('my_part_1.stl');
    });

    it('Storage のパスがログインユーザーのフォルダ配下になること (Storage の RLS がオーナー別フォルダで判定する)', async () => {
        const { assembly, ctx } = await setup();

        await pipeline.execute({ assemblyId: assembly.id, files: [stl('a.stl')] }, ctx);

        expect(storage.uploaded[0].startsWith(`${ctx.userId}/`)).toBe(true);
    });

    describe('入力検証', () => {
        it('存在しないアセンブリは NotFoundError となり、何も作られないこと', async () => {
            const { ctx } = await setup();

            await expect(pipeline.execute(
                { assemblyId: '00000000-0000-4000-8000-000000000000', files: [stl('a.stl')] },
                ctx,
            )).rejects.toThrow(NotFoundError);

            expect(await countRows()).toEqual({ parts: 0, instances: 0 });
            expect(storage.uploadFile).not.toHaveBeenCalled();
        });

        it('他のユーザーのアセンブリへは取り込めず (RLS)、NotFoundError となり、何も保存されないこと', async () => {
            const { assembly } = await setup();
            const other = await createTestAssembly(); // 別の所有者

            await expect(pipeline.execute(
                { assemblyId: assembly.id, files: [stl('a.stl')] },
                { userId: other.ownerId },
            )).rejects.toThrow(NotFoundError);

            expect(await countRows()).toEqual({ parts: 0, instances: 0 });
            expect(storage.uploadFile).not.toHaveBeenCalled();
        });

        it('UUID形式でないアセンブリIDは NotFoundError となること', async () => {
            const { ctx } = await setup();

            await expect(pipeline.execute({ assemblyId: 'not-a-uuid', files: [stl('a.stl')] }, ctx))
                .rejects.toThrow(NotFoundError);
        });

        it.each([0, -1, 1.5, Number.NaN])('必要数 %s は ValidationError となり、何も作られないこと', async (partsQuantity) => {
            const { assembly, ctx } = await setup();

            await expect(pipeline.execute({ assemblyId: assembly.id, files: [stl('a.stl')], partsQuantity }, ctx))
                .rejects.toThrow(ValidationError);

            expect(await countRows()).toEqual({ parts: 0, instances: 0 });
            expect(storage.uploadFile).not.toHaveBeenCalled();
        });

        it('ファイルが空の場合は ValidationError となること', async () => {
            const { assembly, ctx } = await setup();

            await expect(pipeline.execute({ assemblyId: assembly.id, files: [] }, ctx)).rejects.toThrow(ValidationError);
        });

        it.each(['model.obj', 'model', '.stl'])('STL以外/モデル名が空のファイル %s は ValidationError となること', async (fileName) => {
            const { assembly, ctx } = await setup();

            await expect(pipeline.execute({ assemblyId: assembly.id, files: [stl('ok.stl'), stl(fileName)] }, ctx))
                .rejects.toThrow(ValidationError);

            expect(storage.uploadFile).not.toHaveBeenCalled();
        });
    });

    describe('補償処理 (all-or-nothing)', () => {
        it('Storage 保存が途中で失敗した場合、DB には何も作られず、保存済みのファイルが削除されること', async () => {
            const { assembly, ctx } = await setup();
            storage.failUploadAt(2);

            await expect(pipeline.execute(
                { assemblyId: assembly.id, files: [stl('a.stl'), stl('b.stl'), stl('c.stl')] },
                ctx,
            )).rejects.toThrow('Storage upload failed');

            expect(await countRows()).toEqual({ parts: 0, instances: 0 });
            // 1件目だけ保存され、それが削除される。3件目は保存を試みない
            expect(storage.uploaded).toHaveLength(1);
            expect(storage.deleted).toEqual(storage.uploaded);
            expect(storage.uploadFile).toHaveBeenCalledTimes(2);
        });

        it('DB 登録が失敗した場合、全ファイルが削除され、DB には何も作られないこと', async () => {
            const { assembly, ctx } = await setup();
            // 1回目 (アセンブリの存在確認) は実処理、2回目 (登録) だけ失敗させる
            const realTransaction = db.transaction.bind(db);
            const spy = vi.spyOn(db, 'transaction')
                .mockImplementationOnce(realTransaction as any)
                .mockRejectedValueOnce(new Error('DB unavailable'));

            await expect(pipeline.execute(
                { assemblyId: assembly.id, files: [stl('a.stl'), stl('b.stl')] },
                ctx,
            )).rejects.toThrow('DB unavailable');
            spy.mockRestore();

            expect(await countRows()).toEqual({ parts: 0, instances: 0 });
            expect(storage.uploaded).toHaveLength(2);
            expect(storage.deleted.sort()).toEqual([...storage.uploaded].sort());
        });

        it('検証後・登録前にアセンブリが削除された場合、登録が失敗し、全ファイルが削除されること', async () => {
            const { assembly, ctx } = await setup();
            // 1回目 (アセンブリの存在確認) は実処理。2回目 (登録) の直前にアセンブリを削除して、競合削除を再現する
            const realTransaction = db.transaction.bind(db);
            vi.spyOn(db, 'transaction')
                .mockImplementationOnce(realTransaction as any)
                .mockImplementationOnce(async (fn: any) => {
                    // 検証後・登録前にアセンブリが削除された状況を作る
                    await db.delete(assemblies);
                    return realTransaction(fn);
                });

            await expect(pipeline.execute({ assemblyId: assembly.id, files: [stl('a.stl')] }, ctx)).rejects.toThrow();
            vi.restoreAllMocks();

            expect(await countRows()).toEqual({ parts: 0, instances: 0 });
            expect(storage.deleted).toEqual(storage.uploaded);
        });

        it('補償削除が一部失敗しても、元のエラーがスローされ、残りのファイルは削除されること', async () => {
            const { assembly, ctx } = await setup();
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            storage.failUploadAt(3);
            // 1件目の削除だけ失敗させる。パスはパーツIDを含むため、保存後に判明する → 保存履歴から決める
            storage.deleteFile.mockImplementationOnce(async () => {
                throw new Error('Storage delete failed');
            });

            await expect(pipeline.execute(
                { assemblyId: assembly.id, files: [stl('a.stl'), stl('b.stl'), stl('c.stl')] },
                ctx,
            )).rejects.toThrow('Storage upload failed');

            expect(storage.deleteFile).toHaveBeenCalledTimes(2);
            expect(storage.deleted).toHaveLength(1);
            expect(errorSpy).toHaveBeenCalled();
            errorSpy.mockRestore();
        });
    });
});
