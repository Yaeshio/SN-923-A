import { db } from '../src/shared/db';
import { projects, units, parts, boxes, machines, partItems, statusHistory } from '../src/shared/db/schema';
import { v7 as uuidv7 } from 'uuid';
import { eq } from 'drizzle-orm';

export async function createTestProject(overrides?: Partial<typeof projects.$inferInsert>) {
    const data = {
        name: 'Test Project',
        ...overrides,
    };
    const [result] = await db.insert(projects).values(data).returning();
    return result;
}

export async function createTestUnit(overrides?: Partial<typeof units.$inferInsert> & { projectOverrides?: Partial<typeof projects.$inferInsert> }) {
    let projectId = overrides?.projectId;
    if (!projectId) {
        projectId = (await createTestProject(overrides?.projectOverrides)).id;
    }
    const data = {
        projectId,
        name: 'Test Unit',
        ...overrides,
    };
    const [result] = await db.insert(units).values(data).returning();
    return result;
}

export async function createTestPart(overrides?: Partial<typeof parts.$inferInsert> & { unitOverrides?: Partial<typeof units.$inferInsert> }) {
    let unitId = overrides?.unitId;
    if (!unitId) {
        unitId = (await createTestUnit(overrides?.unitOverrides)).id;
    }
    const data = {
        unitId,
        partNumber: 'PN-001',
        stlUrl: 'https://example.com/file.stl',
        status: 'PENDING' as const,
        ...overrides,
    };
    const [result] = await db.insert(parts).values(data).returning();
    return result;
}

export async function createTestBox(overrides?: Partial<typeof boxes.$inferInsert>) {
    const data = {
        name: 'Test Box',
        status: 'AVAILABLE' as const,
        ...overrides,
    };
    const [result] = await db.insert(boxes).values(data).returning();
    return result;
}

export async function createTestMachine(overrides?: Partial<typeof machines.$inferInsert>) {
    const data = {
        name: 'Test Machine',
        type: 'FDM',
        status: 'READY' as const,
        ...overrides,
    };
    const [result] = await db.insert(machines).values(data).returning();
    return result;
}

export async function createTestPartItem(overrides?: Partial<typeof partItems.$inferInsert> & {
    partOverrides?: Partial<typeof parts.$inferInsert>,
    machineOverrides?: Partial<typeof machines.$inferInsert>,
    boxOverrides?: Partial<typeof boxes.$inferInsert>
}) {
    let partId = overrides?.partId;
    if (!partId) {
        partId = (await createTestPart(overrides?.partOverrides)).id;
    }
    let machineId = overrides?.machineId;
    if (!machineId) {
        machineId = (await createTestMachine(overrides?.machineOverrides)).id;
    }
    let boxId = overrides?.boxId;
    // Box is optional, but often needed in tests if not null

    const data = {
        partId,
        machineId,
        boxId,
        status: 'READY' as const,
        ...overrides,
    };
    const [result] = await db.insert(partItems).values(data).returning();
    return result;
}

export async function createTestStatusHistory(overrides?: Partial<typeof statusHistory.$inferInsert> & { itemOverrides?: Partial<typeof partItems.$inferInsert> }) {
    let partItemId = overrides?.partItemId;
    if (!partItemId) {
        partItemId = (await createTestPartItem(overrides?.itemOverrides)).id;
    }
    const data = {
        partItemId,
        statusFrom: 'READY' as const,
        statusTo: 'PRINTING' as const,
        ...overrides,
    };
    const [result] = await db.insert(statusHistory).values(data).returning();
    return result;
}
