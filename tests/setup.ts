import { afterAll, beforeEach } from 'vitest';
import { clearDb, teardownDb } from './utils/db';

// DBの起動とスキーマ適用は tests/globalSetup.ts で1回だけ行う。ここはテストファイルごとの後始末のみ。

afterAll(async () => {
    // Close DB connection after all tests in the file
    await teardownDb();
});

beforeEach(async () => {
    // Clear data before each test to ensure test isolation
    await clearDb();
});
