import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        setupFiles: ['./tests/setup.ts'],
        testTimeout: 10000,
        poolOptions: {
            threads: {
                singleThread: true,
            },
        },
        fileParallelism: false,
    },
});
