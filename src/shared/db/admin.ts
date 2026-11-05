import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// 管理用の接続。DATABASE_ADMIN_URL は postgres ロール (テーブル所有者 / BYPASSRLS) で接続するため、RLS を受けない。
// migration・seed・テストなど、アプリの外のスクリプトだけが使う。**アプリのコード (src/) からは import しないこと。**
// アプリの実行環境 (本番の Next.js) には DATABASE_ADMIN_URL を設定しない。設定すると、接続を分離した意味がなくなる。
//
// アプリ用の接続は ./index の db (DATABASE_URL, app_runtime)。

const connectionString = process.env.DATABASE_ADMIN_URL;

// DATABASE_URL へはフォールバックしない。設定漏れを、アプリ用ロールでの実行 (権限エラー) として黙って通さず、ここで止める。
if (!connectionString) {
    throw new Error('DATABASE_ADMIN_URL is not set. adminDb is for migrations, seeding and tests only (postgres role).');
}

// 本番の Transaction pooler (6543) でも使えるよう、アプリ用と同じく prepare: false にする。
export const adminClient = postgres(connectionString, { prepare: false });
export const adminDb = drizzle(adminClient, { schema });
