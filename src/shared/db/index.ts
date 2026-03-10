import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load appropriate .env file based on environment
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env.local';
dotenv.config({ path: resolve(process.cwd(), envFile) });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    if (process.env.NODE_ENV === 'test') {
        console.warn('DATABASE_URL is missing in test environment. Make sure to set it.');
    } else {
        throw new Error('DATABASE_URL is not set');
    }
}

// In test environment, we might use a dummy URL before initialization, so handle gracefully
export const client = postgres(connectionString || 'postgres://dummy:dummy@localhost:5432/dummy');
export const db = drizzle(client, { schema });

// Helper to provide transaction context like MockDbService did
export const DbService = {
    transaction: async <T>(cb: (tx: typeof db) => Promise<T>): Promise<T> => {
        return db.transaction(cb);
    }
};
