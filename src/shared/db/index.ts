import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// このクライアントは postgres ロール (BYPASSRLS) で接続するため RLS を受けない。
// アプリコードは ./rls の withUser 経由で使い、素の db はテスト・seed・管理処理のみで使うこと。

// DATABASE_URL is required for database operations.
const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV !== 'test') {
    // In Next.js build phase, DATABASE_URL might be missing.
    // We only log a warning instead of throwing to allow the build to complete.
    console.warn('DATABASE_URL is not set. Database connection will fail when accessed.');
}

// In environment where connection string is missing (like build time), use a dummy URL to prevent postgres-js from crashing on initialization
export const client = postgres(connectionString || 'postgres://dummy:dummy@localhost:5432/dummy');
export const db = drizzle(client, { schema });
