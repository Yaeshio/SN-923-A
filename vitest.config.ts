import { defineConfig } from 'vitest/config';
import { parse } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// src/shared/db は import 時に DATABASE_URL を読むため、テストの実行前に .env.test を環境変数へ入れておく。
// .env.local (開発DB) を巻き込まないよう、.env.test だけを読む。
const testEnv = parse(readFileSync(resolve(__dirname, '.env.test')));

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
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
