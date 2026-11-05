import { execFileSync } from 'child_process';
import { parse } from 'dotenv';
import postgres from 'postgres';
import type { GlobalSetupContext } from 'vitest/node';
import { BUCKET, createAdmin, deleteIntegrationUser, INTEGRATION_EMAIL_DOMAIN, type SupabaseEnv } from './admin';

declare module 'vitest' {
    export interface ProvidedContext {
        supabase: SupabaseEnv;
    }
}

// Supabase結合テストの前提確認 (全体で1回)。スタックは自動では起動しない: `npx supabase start` を先に実行しておく。
// 開発用スタックを共有するため、ここでも DB の初期化 (db reset) は行わず、足りないものを案内して終了する。

const LOCAL_HOSTS = ['127.0.0.1', 'localhost'];

let env: SupabaseEnv | undefined;

function readSupabaseEnv(): SupabaseEnv {
    let output: string;
    try {
        output = execFileSync('npx', ['--no-install', 'supabase', 'status', '-o', 'env'], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
        });
    } catch (error: any) {
        throw new Error(
            'このリポジトリ (supabase/config.toml の project_id) の Supabase スタックに接続できません。\n'
            + '`npx supabase start` で起動してから、もう一度実行してください。\n'
            + '別プロジェクトのスタックが同じポート (54321 など) で動いている場合は、先にそちらを `supabase stop` してください。\n\n'
            + `${error.stderr ?? error.message}`,
        );
    }

    const values = parse(output);
    // CLI のバージョンによって、キー名は ANON_KEY / SERVICE_ROLE_KEY または PUBLISHABLE_KEY / SECRET_KEY になる
    const apiUrl = values.API_URL;
    const dbUrl = values.DB_URL;
    const anonKey = values.ANON_KEY ?? values.PUBLISHABLE_KEY;
    const serviceRoleKey = values.SERVICE_ROLE_KEY ?? values.SECRET_KEY;
    if (!apiUrl || !dbUrl || !anonKey || !serviceRoleKey) {
        throw new Error('`supabase status -o env` の出力から API_URL / DB_URL / キーを取得できませんでした。');
    }
    return { apiUrl, dbUrl, anonKey, serviceRoleKey };
}

// 誤って本番など、ローカル以外の Supabase に対して実行しないようにする (tests/globalSetup.ts と同じ考え方)
function assertLocal(label: string, url: string) {
    if (!LOCAL_HOSTS.includes(new URL(url).hostname)) {
        throw new Error(`Refusing to run integration tests against ${label}=${url.replace(/:\/\/[^@/]*@/, '://***@')}`);
    }
}

async function assertSchemaAndBucket(current: SupabaseEnv) {
    const sql = postgres(current.dbUrl, { max: 1, prepare: false, onnotice: () => {} });
    try {
        const [row] = await sql<{ table_name: string | null }[]>`select to_regclass('design.assemblies')::text as table_name`;
        if (!row.table_name) {
            throw new Error('design スキーマがありません。`npx supabase migration up` で supabase/migrations を適用してください。');
        }
    } finally {
        await sql.end();
    }

    const { error } = await createAdmin(current).storage.getBucket(BUCKET);
    if (error) {
        throw new Error(
            `バケット ${BUCKET} がありません (${error.message})。`
            + '`npx supabase migration up` で supabase/migrations/*_secure_stl_storage.sql を適用してください。',
        );
    }
}

// 中断した実行などで残ったテストユーザー (とそのファイル) を削除する。テストが作ったユーザーだけが対象
async function sweepLeftovers(current: SupabaseEnv) {
    const admin = createAdmin(current);
    const perPage = 1000;
    for (let page = 1; ; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
        if (error) throw error;
        for (const user of data.users) {
            if (user.email?.endsWith(`@${INTEGRATION_EMAIL_DOMAIN}`)) {
                await deleteIntegrationUser(admin, user.id);
            }
        }
        if (data.users.length < perPage) break;
    }
}

export async function setup({ provide }: GlobalSetupContext) {
    env = readSupabaseEnv();
    assertLocal('API_URL', env.apiUrl);
    assertLocal('DB_URL', env.dbUrl);
    await assertSchemaAndBucket(env);
    await sweepLeftovers(env);

    console.log(`Supabase integration stack: ${env.apiUrl}`);
    provide('supabase', env);
}

export async function teardown() {
    if (env) {
        await sweepLeftovers(env);
    }
}
