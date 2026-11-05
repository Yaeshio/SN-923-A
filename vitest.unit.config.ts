import { defineConfig } from 'vitest/config';

// ユニット層: Docker・DB・ネットワークを使わない。DB と Storage のモジュールは vi.mock で差し替える。
// DB起動と clearDb を行う globalSetup / setupFiles は意図的に指定しない。
export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        include: ['tests/**/*.unit.test.ts'],
    },
});
