import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportPipelineImpl, toStorageSafeName } from '../../../../src/modules/design-registry/pipelines/ImportPipeline';
import { withUser } from '../../../../src/shared/db/rls';
import { StorageService } from '../../../../src/shared/services';
import { NotFoundError, ValidationError } from '../../../../src/shared/errors';

// ユニット層: DB にも Storage にも触れない。
// 入力検証が I/O より前で完結していることを、モックが呼ばれないことで確認する。
// DB を使う登録・RLS・補償処理は ImportPipeline.test.ts (DB結合)、実バケットは ImportPipeline.integration.test.ts。
vi.mock('../../../../src/shared/db/rls', () => ({
    withUser: vi.fn(async () => {
        throw new Error('withUser must not be called in a unit test');
    }),
}));
vi.mock('../../../../src/shared/services', () => ({
    StorageService: { uploadFile: vi.fn(), deleteFile: vi.fn(), getDownloadUrl: vi.fn() },
}));

const ASSEMBLY_ID = '00000000-0000-4000-8000-000000000000';
const ctx = { userId: '11111111-1111-4111-8111-111111111111' };

const stl = (name: string) => new File(['solid test\nendsolid test\n'], name, { type: 'model/stl' });

describe('toStorageSafeName', () => {
    it.each([
        ['bracket.stl', 'bracket.stl'],
        ['COVER.STL', 'COVER.stl'], // 拡張子は小文字に揃え、本体の大文字小文字は保つ
        ['part.v2.final.stl', 'part.v2.final.stl'],
        ['my part (1).stl', 'my_part_1.stl'],
        ['  spaced  .stl', 'spaced.stl'],
        ['a/b\\c.stl', 'a_b_c.stl'], // パス区切りは Storage のキーに持ち込まない
        ['ブラケット 試作 v2.stl', 'v2.stl'], // ASCII 以外は取り除き、残った部分だけを使う
        ['ブラケット.stl', 'model.stl'], // 何も残らなければ model にする
        ['日本語.STL', 'model.stl'],
    ])('%s → %s', (fileName, expected) => {
        expect(toStorageSafeName(fileName)).toBe(expected);
    });

    it('Storage のキーに使える文字だけになること', () => {
        for (const name of ['ブラケット 試作.stl', 'a b c.stl', '部品(1)#2.stl', '😀.stl']) {
            expect(toStorageSafeName(name)).toMatch(/^[A-Za-z0-9._-]+\.stl$/);
        }
    });
});

describe('ImportPipeline.execute: 入力検証 (DB・Storage に触れる前に失敗する)', () => {
    let pipeline: ImportPipelineImpl;

    beforeEach(() => {
        vi.clearAllMocks();
        pipeline = new ImportPipelineImpl();
    });

    // 検証で弾いた場合は DB の検索にも Storage の保存にも進まない
    function expectNoIo() {
        expect(withUser).not.toHaveBeenCalled();
        expect(StorageService.uploadFile).not.toHaveBeenCalled();
        expect(StorageService.deleteFile).not.toHaveBeenCalled();
    }

    it('ファイルが空の場合は ValidationError となること', async () => {
        await expect(pipeline.execute({ assemblyId: ASSEMBLY_ID, files: [] }, ctx)).rejects.toThrow(ValidationError);

        expectNoIo();
    });

    it.each([0, -1, 1.5, Number.NaN])('必要数 %s は ValidationError となること', async (partsQuantity) => {
        await expect(pipeline.execute({ assemblyId: ASSEMBLY_ID, files: [stl('a.stl')], partsQuantity }, ctx))
            .rejects.toThrow(ValidationError);

        expectNoIo();
    });

    it.each(['model.obj', 'model', '.stl'])('STL以外/モデル名が空のファイル %s は ValidationError となること', async (fileName) => {
        // 先頭に有効なファイルがあっても、1件でも不正なら全体を拒否する
        await expect(pipeline.execute({ assemblyId: ASSEMBLY_ID, files: [stl('ok.stl'), stl(fileName)] }, ctx))
            .rejects.toThrow(ValidationError);

        expectNoIo();
    });

    it('UUID形式でないアセンブリIDは NotFoundError となり、DB を検索しないこと', async () => {
        await expect(pipeline.execute({ assemblyId: 'not-a-uuid', files: [stl('a.stl')] }, ctx))
            .rejects.toThrow(NotFoundError);

        expectNoIo();
    });

    // 否定のテストが「何を渡しても失敗する」状態で通らないよう、有効な入力は検証を通過して検索へ進むことを確認する
    it.each([undefined, 1, 5])('有効な必要数 %s は検証を通り、アセンブリの検索へ進むこと', async (partsQuantity) => {
        vi.mocked(withUser).mockResolvedValueOnce(undefined);

        await expect(pipeline.execute({ assemblyId: ASSEMBLY_ID, files: [stl('a.stl'), stl('B.STL')], partsQuantity }, ctx))
            .rejects.toThrow(NotFoundError);

        expect(withUser).toHaveBeenCalledTimes(1);
        expect(withUser).toHaveBeenCalledWith(ctx.userId, expect.any(Function));
        // アセンブリが見つからない場合は、Storage に何も保存しない
        expect(StorageService.uploadFile).not.toHaveBeenCalled();
    });
});
