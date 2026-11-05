import { describe, it, expect, vi, afterEach } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { ImportPipelineImpl } from '../../../../src/modules/design-registry/pipelines/ImportPipeline';
import { StorageService } from '../../../../src/shared/services';
import { NotFoundError } from '../../../../src/shared/errors';
import { db } from '../../../../src/shared/db';
import { parts, partInstances } from '../../../../src/shared/db/schema';
import { createTestAssembly } from '../../../factories';
import { asUser, BUCKET, createUserTracker, getAdmin, listBucketFiles } from '../../../integration/helpers';
import { loadStl, readStlFixture, type StlFixture } from '../../../utils/stl';

// Supabase結合層: 実STLを実バケット (stl-files) へ保存し、実DBへ登録する。`npx supabase start` が前提。
// StorageService は実物のまま通し、セッションだけ createClient() の差し替えでテストユーザーのものにする (integration/helpers)。
// 失敗の注入を網羅する補償処理のマトリクスは ImportPipeline.test.ts (DB結合) に任せ、ここでは
// 「バケットから本当にファイルが消えること」を確認する代表ケースだけを置く。
vi.mock('../../../../src/shared/lib/supabase/server', async () => (await import('../../../integration/helpers')).serverClientModule());

describe('ImportPipeline (Supabase結合: 実STL → 実バケット → DB)', () => {
    const pipeline = new ImportPipelineImpl();
    const users = createUserTracker();

    afterEach(async () => {
        vi.restoreAllMocks();
        await users.cleanup();
    });

    // 実ユーザー (Auth) を作ってサインインし、そのユーザーのアセンブリを用意する
    async function setup() {
        const user = await users.create();
        asUser(user);
        const assembly = await createTestAssembly({ ownerId: user.id });
        return { user, assembly, ctx: { userId: user.id } };
    }

    // 共有の開発DBを TRUNCATE できないため、件数は「このテストのアセンブリ配下」だけを数える
    async function rowsOf(assemblyId: string) {
        const partRows = await db.select().from(parts).where(eq(parts.assemblyId, assemblyId));
        const instanceRows = partRows.length === 0
            ? []
            : await db.select().from(partInstances).where(inArray(partInstances.partId, partRows.map((p) => p.id)));
        return { parts: partRows, instances: instanceRows };
    }

    // バケットに保存されたバイト列 (service-role で直接読む。アプリの経路には依存しない)
    async function readFromBucket(path: string): Promise<Buffer> {
        const { data, error } = await getAdmin().storage.from(BUCKET).download(path);
        if (error) throw error;
        return Buffer.from(await data.arrayBuffer());
    }

    function expectSameAsFixture(stored: Buffer, fixture: StlFixture) {
        const expected = readStlFixture(fixture);
        expect(stored.length).toBe(expected.length);
        expect(stored.equals(expected)).toBe(true);
    }

    it('実STLがバケットへそのまま保存され、パーツと改訂1の初期インスタンスが DB に登録されること', async () => {
        const { user, assembly, ctx } = await setup();

        const result = await pipeline.execute({
            assemblyId: assembly.id,
            files: [loadStl('cube-ascii.stl', 'bracket.stl'), loadStl('cube-binary.stl', 'cover.STL')],
            partsQuantity: 3,
        }, ctx);

        expect(result).toHaveLength(2);
        const [bracket, cover] = result;

        // 保存先は {userId}/parts/{partId}/{安全なファイル名}
        expect(bracket.part.modelUrl).toBe(`${user.id}/parts/${bracket.part.id}/bracket.stl`);
        expect(cover.part.modelUrl).toBe(`${user.id}/parts/${cover.part.id}/cover.stl`);

        // バケット: ユーザーのフォルダには登録した2件だけがあり、中身がフィクスチャと1バイトも違わない (ASCII / バイナリ)
        expect(await listBucketFiles(getAdmin(), user.id)).toEqual([bracket.part.modelUrl, cover.part.modelUrl].sort());
        expectSameAsFixture(await readFromBucket(bracket.part.modelUrl), 'cube-ascii.stl');
        expectSameAsFixture(await readFromBucket(cover.part.modelUrl), 'cube-binary.stl');

        // DB: 戻り値ではなく、永続化された行を確認する
        const rows = await rowsOf(assembly.id);
        expect(rows.parts).toHaveLength(2);
        expect(rows.instances).toHaveLength(2);
        for (const { part } of result) {
            expect(rows.parts.find((p) => p.id === part.id)).toMatchObject({
                assemblyId: assembly.id,
                modelName: part.modelName,
                modelUrl: part.modelUrl,
                partsQuantity: 3,
            });
            // 初期インスタンスは改訂1で、名前とパスは親パーツのコピー、change_note は NULL
            expect(rows.instances.find((i) => i.partId === part.id)).toMatchObject({
                revision: 1,
                instanceName: part.modelName,
                instanceUrl: part.modelUrl,
                changeNote: null,
            });
        }
        expect(rows.parts.map((p) => p.modelName).sort()).toEqual(['bracket', 'cover']);
    });

    it('日本語などASCII以外のファイル名でも保存でき、モデル名には元の名前が残ること', async () => {
        const { user, assembly, ctx } = await setup();

        const [withAscii, onlyNonAscii] = await pipeline.execute({
            assemblyId: assembly.id,
            files: [loadStl('cube-ascii.stl', 'ブラケット 試作 v2.stl'), loadStl('cube-binary.stl', '日本語.STL')],
        }, ctx);

        // 保存時のキーは ASCII に正規化される (Storage はキーの ASCII 以外を受け付けない場合がある)
        expect(withAscii.part.modelUrl).toBe(`${user.id}/parts/${withAscii.part.id}/v2.stl`);
        expect(onlyNonAscii.part.modelUrl).toBe(`${user.id}/parts/${onlyNonAscii.part.id}/model.stl`);
        // 元のファイル名は model_name / instance_name に残る (ダウンロード時の名前はここから付く)
        expect(withAscii.part.modelName).toBe('ブラケット 試作 v2');
        expect(onlyNonAscii.instance.instanceName).toBe('日本語');

        expectSameAsFixture(await readFromBucket(withAscii.part.modelUrl), 'cube-ascii.stl');
        expectSameAsFixture(await readFromBucket(onlyNonAscii.part.modelUrl), 'cube-binary.stl');
    });

    it('他のユーザーのアセンブリへは取り込めず (RLS)、バケットにも DB にも何も残らないこと', async () => {
        const owner = await setup();
        const intruder = await users.create();
        asUser(intruder);

        await expect(pipeline.execute(
            { assemblyId: owner.assembly.id, files: [loadStl('cube-ascii.stl', 'a.stl')] },
            { userId: intruder.id },
        )).rejects.toThrow(NotFoundError);

        const admin = getAdmin();
        expect(await listBucketFiles(admin, intruder.id)).toEqual([]);
        expect(await listBucketFiles(admin, owner.user.id)).toEqual([]);
        expect((await rowsOf(owner.assembly.id)).parts).toEqual([]);

        // 対照: 所有者は同じアセンブリへ登録できる。
        // (ポリシーが壊れて全員が拒否される状態でも、上の検証は通ってしまうため、成功側とセットにする)
        asUser(owner.user);
        const [registered] = await pipeline.execute(
            { assemblyId: owner.assembly.id, files: [loadStl('cube-ascii.stl', 'a.stl')] },
            owner.ctx,
        );
        expect(await listBucketFiles(admin, owner.user.id)).toEqual([registered.part.modelUrl]);
        expect((await rowsOf(owner.assembly.id)).parts).toHaveLength(1);
    });

    describe('補償処理 (実バケットから本当に消えること)', () => {
        it('DB 登録が失敗した場合、保存済みの全ファイルがバケットから削除され、DB には何も作られないこと', async () => {
            const { user, assembly, ctx } = await setup();
            const uploadSpy = vi.spyOn(StorageService, 'uploadFile'); // 実物を通して記録だけ取る
            // 1回目 (アセンブリの存在確認) は実処理、2回目 (登録) だけ失敗させる
            const realTransaction = db.transaction.bind(db);
            vi.spyOn(db, 'transaction')
                .mockImplementationOnce(realTransaction as any)
                .mockRejectedValueOnce(new Error('DB unavailable'));

            await expect(pipeline.execute({
                assemblyId: assembly.id,
                files: [loadStl('cube-ascii.stl', 'a.stl'), loadStl('cube-binary.stl', 'b.stl')],
            }, ctx)).rejects.toThrow('DB unavailable');

            // 2件とも実際に保存されたうえで、バケットには何も残っていない
            expect(await Promise.all(uploadSpy.mock.results.map((result) => result.value))).toHaveLength(2);
            expect(await listBucketFiles(getAdmin(), user.id)).toEqual([]);
            expect((await rowsOf(assembly.id)).parts).toEqual([]);
        });

        it('Storage への保存が途中で失敗した場合、保存済みのファイルがバケットから削除され、DB には何も作られないこと', async () => {
            const { user, assembly, ctx } = await setup();
            const upload = StorageService.uploadFile;
            let calls = 0;
            const uploadSpy = vi.spyOn(StorageService, 'uploadFile').mockImplementation(async (file, path) => {
                calls += 1;
                if (calls === 2) throw new Error('Storage upload failed');
                return upload(file, path); // 1件目は実際にバケットへ保存する
            });

            await expect(pipeline.execute({
                assemblyId: assembly.id,
                files: [loadStl('cube-ascii.stl', 'a.stl'), loadStl('cube-binary.stl', 'b.stl'), loadStl('cube-ascii.stl', 'c.stl')],
            }, ctx)).rejects.toThrow('Storage upload failed');

            // 1件目は実際に保存され、2件目で失敗し、3件目は保存を試みない
            expect(uploadSpy).toHaveBeenCalledTimes(2);
            expect(await uploadSpy.mock.results[0].value).toMatch(new RegExp(`^${user.id}/parts/`));
            // 保存済みの1件目がバケットから削除され、DB には何も作られない (all-or-nothing)
            expect(await listBucketFiles(getAdmin(), user.id)).toEqual([]);
            expect((await rowsOf(assembly.id)).parts).toEqual([]);
        });
    });
});
