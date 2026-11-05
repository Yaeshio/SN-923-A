import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// アプリ用の接続。DATABASE_URL は専用ロール app_runtime (NOBYPASSRLS) で接続する
// (supabase/migrations/*_create_app_runtime_role.sql)。
// app_runtime は design スキーマの権限を直接持たないため、この db を素のまま使うクエリは permission denied になる。
// 必ず ./rls の withUser 経由で使うこと (トランザクション内で authenticated ロールへ切り替えて RLS を効かせる)。
//
// migration・seed・テストなど、RLS を受けない管理用の接続は ./admin の adminDb を使う (アプリのコードからは import しない)。

// DATABASE_URL is required for database operations.
const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV !== 'test') {
    // In Next.js build phase, DATABASE_URL might be missing.
    // We only log a warning instead of throwing to allow the build to complete.
    console.warn('DATABASE_URL is not set. Database connection will fail when accessed.');
}

// In environment where connection string is missing (like build time), use a dummy URL to prevent postgres-js from crashing on initialization
// 本番は Supabase の Transaction pooler (6543) 経由で、prepared statement が使えないため prepare: false にする。
export const client = postgres(connectionString || 'postgres://dummy:dummy@localhost:5432/dummy', { prepare: false });
export const db = drizzle(client, { schema });
