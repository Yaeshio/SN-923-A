import { db, client } from '../../src/shared/db';
import { sql } from 'drizzle-orm';
import { projects, units, parts, boxes, machines, partItems, statusHistory } from '../../src/shared/db/schema';

// Utility to clear all data
export async function clearDb() {
    try {
        // Using TRUNCATE with CASCADE is more robust than individual deletes
        // We list all tables to ensure they are cleared
        await db.execute(sql`
            TRUNCATE TABLE 
                "status_history", 
                "part_items", 
                "parts", 
                "units", 
                "projects", 
                "machines", 
                "boxes" 
            RESTART IDENTITY CASCADE;
        `);
    } catch (e) {
        console.error('Failed to clear database:', e);
    }
}

// Global setup hook
export async function setupDb() {
    // Schema synchronization is handled in tests/setup.ts via drizzle-kit push
}

export async function teardownDb() {
    // Close the connection to prevent Vitest from hanging
    await client.end();
}
