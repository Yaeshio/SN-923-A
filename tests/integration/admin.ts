import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Supabase結合テストの管理用ヘルパー。service-role で操作するため、vitest にも src/shared/db にも依存させない
// (globalSetup とテストの両方から使う)。

export const BUCKET = 'stl-files';

// テストが作るユーザーのメールドメイン。中断した実行の残骸を globalSetup で見分けて掃除するために使う。
export const INTEGRATION_EMAIL_DOMAIN = 'integration.example.com';

export interface SupabaseEnv {
    apiUrl: string;
    /** 管理用 (postgres ロール)。supabase status の DB_URL。DATABASE_ADMIN_URL にする。 */
    dbUrl: string;
    /** アプリ用 (app_runtime ロール)。dbUrl のユーザー・パスワードを置き換えたもの。DATABASE_URL にする。 */
    appDbUrl: string;
    anonKey: string;
    serviceRoleKey: string;
}

export type Admin = SupabaseClient;

export function createAdmin(env: Pick<SupabaseEnv, 'apiUrl' | 'serviceRoleKey'>): Admin {
    return createClient(env.apiUrl, env.serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

/** バケット内の prefix 配下のファイルを、フォルダを辿ってすべて返す (パスは prefix を含む)。 */
export async function listBucketFiles(admin: Admin, prefix: string): Promise<string[]> {
    const files: string[] = [];
    const pageSize = 100;
    for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await admin.storage.from(BUCKET).list(prefix, { limit: pageSize, offset });
        if (error) throw error;
        for (const entry of data) {
            const path = `${prefix}/${entry.name}`;
            // フォルダは id が null で返る
            if (entry.id === null) {
                files.push(...await listBucketFiles(admin, path));
            } else {
                files.push(path);
            }
        }
        if (data.length < pageSize) break;
    }
    return files.sort();
}

/**
 * テストユーザーを完全に消す。バケットの `${userId}/` 配下のファイルを Storage API で削除してから、ユーザーを削除する。
 * ユーザーの削除で、design スキーマのアセンブリ以下は ON DELETE CASCADE で消える。
 * storage.objects は直接 DELETE できない (Storage API 経由が必要) ため、ファイルを先に消す。
 */
export async function deleteIntegrationUser(admin: Admin, userId: string): Promise<void> {
    const files = await listBucketFiles(admin, userId);
    for (let i = 0; i < files.length; i += 100) {
        const { error } = await admin.storage.from(BUCKET).remove(files.slice(i, i + 100));
        if (error) throw error;
    }
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;
}
