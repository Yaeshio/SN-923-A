import { db, client } from '../../src/shared/db';
import { sql } from 'drizzle-orm';
import { projects, units, parts, boxes, machines, partItems, statusHistory } from '../../src/shared/db/schema';

// Utility to clear all data
export async function clearDb() {
    // Disable constraints temporarily or delete in order
    // Order matters for foreign key constraints if not using TRUNCATE CASCADE
    try {
        await db.delete(statusHistory);
        await db.delete(partItems);
        await db.delete(parts);
        await db.delete(units);
        await db.delete(projects);
        await db.delete(machines);
        await db.delete(boxes);
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
