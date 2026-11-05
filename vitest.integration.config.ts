import { defineConfig } from 'vitest/config';

// Supabase結合層: `npx supabase start` で起動したローカルスタック (実Storage + 実DB + 実Auth) に対して実行する。
// 接続先は globalSetup が `supabase status` から取得する。.env.test は読まない (5432 のテストDBへ向かないようにする)。
// 開発用スタックを共有するため、DB全体の TRUNCATE は行わず、テストが作ったデータだけを個別に削除する。
export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        include: ['tests/**/*.integration.test.ts'],
        globalSetup: ['./tests/integration/globalSetup.ts'],
        setupFiles: ['./tests/integration/setup.ts'],
        testTimeout: 30000,
        hookTimeout: 60000,
        poolOptions: {
            threads: {
                singleThread: true,
            },
        },
        fileParallelism: false,
    },
});
