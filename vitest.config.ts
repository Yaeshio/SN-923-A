import { configDefaults, defineConfig } from 'vitest/config';
import { parse } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// src/shared/db は import 時に DATABASE_URL を読むため、テストの実行前に .env.test を環境変数へ入れておく。
// .env.local (開発DB) を巻き込まないよう、.env.test だけを読む。
const testEnv = parse(readFileSync(resolve(__dirname, '.env.test')));

// この設定は「DB結合」層 (実Postgresコンテナ + Storageフェイク)。
// ユニット (vitest.unit.config.ts) と Supabase結合 (vitest.integration.config.ts) は、別の設定・別のスクリプトで実行する。
export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        exclude: [...configDefaults.exclude, '**/*.unit.test.ts', '**/*.integration.test.ts'],
        env: testEnv,
        globalSetup: ['./tests/globalSetup.ts'],
        setupFiles: ['./tests/setup.ts'],
        testTimeout: 10000,
        hookTimeout: 120000,
        poolOptions: {
            threads: {
                singleThread: true,
            },
        },
        fileParallelism: false,
    },
});
