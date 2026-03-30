import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// DATABASE_URL is required for database operations.
const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV !== 'test') {
    // In Next.js build phase, DATABASE_URL might be missing.
    // We only log a warning instead of throwing to allow the build to complete.
    console.warn('DATABASE_URL is not set. Database connection will fail when accessed.');
}

// In environment where connection string is missing (like build time), use a dummy URL to prevent postgres-js from crashing on initialization
export const client = postgres(connectionString || 'postgres://dummy:dummy@localhost:5432/dummy');
export const db = drizzle(client, { schema });

// Helper to provide transaction context like MockDbService did
export const DbService = {
    transaction: async <T>(cb: (tx: any) => Promise<T>): Promise<T> => {
        return db.transaction(cb);
    }
};
