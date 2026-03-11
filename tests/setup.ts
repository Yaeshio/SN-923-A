import { beforeAll, afterAll, beforeEach } from 'vitest';
import { clearDb, teardownDb } from './utils/db';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import path from 'path';

// Pre-load environment variables to ensure tools using them have access
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

process.env.NODE_ENV = 'test';

beforeAll(async () => {
    // Automatically synchronize schema before running tests
    try {
        console.log('Synchronizing database schema...');
        // We use drizzle-kit push to ensure the test DB matches the current schema.ts
        // --force or similar flags are usually needed if there are breaking changes, 
        // but for test DB it is generally acceptable.
        execSync('npx drizzle-kit push --force', { stdio: 'inherit' });
    } catch (error) {
        console.error('Failed to synchronize database schema:', error);
        process.exit(1);
    }
});

afterAll(async () => {
    // Close DB connection after all tests
    await teardownDb();
});

beforeEach(async () => {
    // Clear data before each test to ensure test isolation
    await clearDb();
});
