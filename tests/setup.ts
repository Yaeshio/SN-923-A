import { beforeAll, afterAll, beforeEach } from 'vitest';
import { clearDb, teardownDb } from './utils/db';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import path from 'path';

// Pre-load environment variables to ensure tools using them have access
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

process.env.NODE_ENV = 'test';

async function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function ensureDbRunning() {
    const containerName = 'supabase-local-vitest';
    console.log('Ensuring test database is running...');

    try {
        // 1. Check if port 5432 is occupied
        try {
            execSync('nc -z 127.0.0.1 5432', { stdio: 'ignore' });
            
            // Port is active. Check which container is using it.
            const occupyingContainer = execSync('docker ps -q --filter "publish=5432"', { encoding: 'utf8' }).trim();
            if (occupyingContainer) {
                const name = execSync(`docker inspect --format="{{.Name}}" ${occupyingContainer}`, { encoding: 'utf8' }).trim().replace('/', '');
                if (name !== containerName) {
                    console.log(`Port 5432 is occupied by container "${name}". Stopping it for tests...`);
                    execSync(`docker stop ${occupyingContainer}`);
                    await wait(2000); // Give it a moment to release the port
                } else {
                    console.log('Test database container is already running.');
                    return;
                }
            } else {
                console.warn('Port 5432 is occupied by a non-docker process or unknown container. Tests might fail if it is not PostgreSQL.');
                return;
            }
        } catch (e) {
            // Port is free or nc failed (meaning port is likely free)
        }

        // 2. Start our test container
        const containerId = execSync(`docker ps -a -q -f name=^/${containerName}$`, { encoding: 'utf8' }).trim();
        if (containerId) {
            console.log(`Starting existing test container "${containerName}"...`);
            execSync(`docker start ${containerName}`);
        } else {
            console.log(`Creating and starting new test container "${containerName}"...`);
            // Use standard postgres:16-alpine as the "NeonLocal" replacement for testing
            execSync(`docker run --name ${containerName} -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=testdb -p 5432:5432 -d postgres:16-alpine`);
        }

        // 3. Wait for database to be truly ready (not just port open)
        console.log('Waiting for database to be ready (pg_isready)...');
        let ready = false;
        for (let i = 0; i < 30; i++) {
            try {
                // Run pg_isready inside the container
                execSync(`docker exec ${containerName} pg_isready -U postgres`, { stdio: 'ignore' });
                ready = true;
                break;
            } catch (err) {
                await wait(1000);
            }
        }
        
        if (!ready) throw new Error('Database container started but pg_isready failed within 30s.');
        
        // Final grace period for internal initialization
        await wait(2000);
        console.log('Database is ready.');
    } catch (error) {
        console.error('Failed to ensure database is running:', error);
        throw error;
    }
}

beforeAll(async () => {
    // Ensure DB is running before synchronization
    await ensureDbRunning();

    // Automatically synchronize schema before running tests
    try {
        console.log('Synchronizing database schema...');
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
