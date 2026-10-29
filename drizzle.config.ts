import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

import { resolve } from 'path';

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env.local';
dotenv.config({ path: resolve(process.cwd(), envFile) });

export default defineConfig({
    schema: './src/shared/db/schema.ts',
    out: './drizzle',
    dialect: 'postgresql',
    // 共有 Supabase の public には他アプリのテーブルがあり、push が DROP を提案しうるため含めない。
    // 製造側 (public) のテーブルを追加する時点で見直す。
    schemaFilter: ['design'],
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
});
