import { randomUUID } from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { inject } from 'vitest';
import { createAdmin, deleteIntegrationUser, INTEGRATION_EMAIL_DOMAIN, type Admin } from './admin';

export { BUCKET, listBucketFiles, type Admin } from './admin';

/** service-role の管理用クライアント (検証用にバケットの中身を直接読むなど)。アプリの経路では使わない。 */
export function getAdmin(): Admin {
    return createAdmin(inject('supabase'));
}

export interface IntegrationUser {
    id: string;
    email: string;
    /** このユーザーでサインイン済みのクライアント。StorageService はこのセッションで Storage を呼ぶ。 */
    client: SupabaseClient;
}

/** Auth Admin API で実ユーザーを作り、サインインしたクライアントと一緒に返す。 */
export async function createIntegrationUser(): Promise<IntegrationUser> {
    const env = inject('supabase');
    const email = `${randomUUID()}@${INTEGRATION_EMAIL_DOMAIN}`;
    const password = randomUUID();

    const { data, error } = await createAdmin(env).auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;

    const client = createClient(env.apiUrl, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;

    return { id: data.user.id, email, client };
}

// StorageService は src/shared/lib/supabase/server の createClient() で Storage を呼ぶ。
// これは next/headers の cookies() に依存して Next のリクエスト外では動かないため、テストでは
// 「今のユーザーとしてサインイン済みの supabase-js クライアント」を返すものに差し替える。StorageService 自体は実物のまま通る。
let sessionClient: SupabaseClient | undefined;

/** 以降の Storage 呼び出しを、このユーザーのセッションで行う。 */
export function asUser(user: IntegrationUser) {
    sessionClient = user.client;
}

/**
 * `vi.mock` の factory に渡す、src/shared/lib/supabase/server の代替:
 * `vi.mock('.../src/shared/lib/supabase/server', async () => (await import('.../integration/helpers')).serverClientModule())`
 */
export function serverClientModule() {
    return {
        createClient: async () => {
            if (!sessionClient) {
                throw new Error('Storage を呼ぶ前に asUser() でユーザーを選んでください');
            }
            return sessionClient;
        },
    };
}

/** テストが作ったユーザーを記録し、afterEach で (バケットのファイルとアセンブリ以下も含めて) 削除する。 */
export function createUserTracker() {
    const users: IntegrationUser[] = [];

    return {
        async create(): Promise<IntegrationUser> {
            const user = await createIntegrationUser();
            users.push(user);
            return user;
        },

        async cleanup(): Promise<void> {
            sessionClient = undefined;
            const admin = getAdmin();
            const results = await Promise.allSettled(users.splice(0).map((user) => deleteIntegrationUser(admin, user.id)));
            const failed = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
            if (failed) throw failed.reason;
        },
    };
}
