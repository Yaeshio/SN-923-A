import { readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import postgres from 'postgres';

// テストDBは素の PostgreSQL のため、Supabase が提供する auth スキーマとロールの最小限の互換品を用意する。
// RLS ポリシー (auth.uid() / authenticated ロール) と auth.users への外部キーを、本番と同じ形で検証するために必要。
const SUPABASE_STUB_SQL = `
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
    id uuid PRIMARY KEY
);

-- Supabase と同じ定義: JWT claims の sub を返す
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
    SELECT coalesce(
        nullif(current_setting('request.jwt.claim.sub', true), ''),
        (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
    END IF;
END
$$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;

-- design スキーマは毎回作り直し、デプロイするものと同じ migration から作る。
DROP SCHEMA IF EXISTS design CASCADE;
`;

const MIGRATIONS_DIR = resolve(__dirname, '../../supabase/migrations');

// 素の PostgreSQL に適用できる migration (Supabase 専用の storage 設定などは含めない)
const DESIGN_SCHEMA_MIGRATION = /_create_design_schema\.sql$/;

/**
 * テストDBを準備する: Supabase 互換スタブ → design スキーマを作り直し → supabase/migrations の SQL を適用。
 *
 * drizzle-kit push を使わない理由: push は RLS ポリシーの USING / WITH CHECK を落として作成するため、
 * 本番と挙動が食い違う。migration の SQL を適用すれば、デプロイされるスキーマそのものをテストできる。
 */
export async function prepareTestDatabase(connectionString: string) {
    const files = readdirSync(MIGRATIONS_DIR).filter((name) => DESIGN_SCHEMA_MIGRATION.test(name)).sort();
    if (files.length === 0) {
        throw new Error(`No design schema migration found in ${MIGRATIONS_DIR}`);
    }

    const sql = postgres(connectionString, { max: 1, onnotice: () => {} });
    try {
        await sql.unsafe(SUPABASE_STUB_SQL);
        for (const file of files) {
            await sql.unsafe(readFileSync(resolve(MIGRATIONS_DIR, file), 'utf8'));
        }
    } finally {
        await sql.end();
    }
}
