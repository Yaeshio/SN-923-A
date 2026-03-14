import { db } from './index';
import * as schema from './schema';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
    console.log('Seeding database...');

    // 1. Create a Project
    const [project] = await db.insert(schema.projects).values({
        id: uuidv4(),
        name: 'Project SN-923',
    }).returning();
    console.log('Project created:', project.name);

    // 2. Create a Unit
    const [unit] = await db.insert(schema.units).values({
        id: uuidv4(),
        projectId: project.id,
        name: 'Unit A-01',
    }).returning();
    console.log('Unit created:', unit.name);

    // 3. Create a Part
    const [part] = await db.insert(schema.parts).values({
        id: uuidv4(),
        unitId: unit.id,
        partNumber: 'PN-001',
        stlUrl: 'https://example.com/pn001.stl',
        status: 'ACTIVE',
    }).returning();
    console.log('Part created:', part.partNumber);

    // 4. Create a Machine
    const [machine] = await db.insert(schema.machines).values({
        id: uuidv4(),
        name: '3D Printer 01',
        type: 'FDM',
        status: 'READY',
    }).returning();
    console.log('Machine created:', machine.name);

    // 5. Create a Box
    const [box] = await db.insert(schema.boxes).values({
        id: uuidv4(),
        name: 'Storage Box 01',
        status: 'OCCUPIED',
    }).returning();
    console.log('Box created:', box.name);

    // 6. Create a PartItem
    const [partItem] = await db.insert(schema.partItems).values({
        id: uuidv4(),
        partId: part.id,
        machineId: machine.id,
        boxId: box.id,
        status: 'READY',
    }).returning();
    console.log('PartItem created:', partItem.id);

    // 7. Create Status History
    await db.insert(schema.statusHistory).values({
        id: uuidv4(),
        partItemId: partItem.id,
        statusFrom: null,
        statusTo: 'READY',
        reasonCode: null,
        comment: 'Initial seed',
    });
    console.log('Status history created');

    console.log('Seeding completed successfully!');
    process.exit(0);
}

seed().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
