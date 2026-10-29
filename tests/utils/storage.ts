import { vi } from 'vitest';

/**
 * StorageService のフェイク。呼び出し履歴 (保存・削除されたパス) の記録と、失敗の注入ができる。
 * `vi.mock('.../shared/services', ...)` で StorageService として差し替えて使う。
 */
export function createStorageFake() {
    const state = {
        uploadCalls: 0,
        failUploadAt: null as number | null,
        failDeleteFor: new Set<string>(),
        uploaded: [] as string[],
        deleted: [] as string[],
    };

    const uploadFile = vi.fn(async (_file: Blob, path: string) => {
        state.uploadCalls += 1;
        if (state.failUploadAt === state.uploadCalls) {
            throw new Error('Storage upload failed');
        }
        state.uploaded.push(path);
        return path;
    });

    const deleteFile = vi.fn(async (path: string) => {
        if (state.failDeleteFor.has(path)) {
            throw new Error(`Storage delete failed: ${path}`);
        }
        state.deleted.push(path);
    });

    const getDownloadUrl = vi.fn(async (path: string, downloadName?: string) =>
        `https://storage.test/${path}?download=${encodeURIComponent(downloadName ?? '')}`);

    return {
        uploadFile,
        deleteFile,
        getDownloadUrl,

        /** 保存に成功したパス (呼び出し順) */
        get uploaded() { return state.uploaded; },
        /** 削除に成功したパス (呼び出し順) */
        get deleted() { return state.deleted; },

        /** n 番目 (1始まり) の uploadFile 呼び出しで例外を投げる */
        failUploadAt(n: number) { state.failUploadAt = n; },
        /** 指定パスの deleteFile で例外を投げる (補償削除の失敗の再現) */
        failDeleteFor(path: string) { state.failDeleteFor.add(path); },

        /** 履歴と失敗注入を初期化する */
        reset() {
            state.uploadCalls = 0;
            state.failUploadAt = null;
            state.failDeleteFor.clear();
            state.uploaded.length = 0;
            state.deleted.length = 0;
            uploadFile.mockClear();
            deleteFile.mockClear();
            getDownloadUrl.mockClear();
        },
    };
}

export type StorageFake = ReturnType<typeof createStorageFake>;
