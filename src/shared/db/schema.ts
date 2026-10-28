import { pgTable, text, timestamp, varchar, pgEnum, uuid, pgSchema } from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';

// Schema
export const sn923aSchema = pgSchema('sn923a');

// Enums
export const partStatusEnum = sn923aSchema.enum('part_status', ['PENDING', 'ACTIVE']);
export const itemStatusEnum = sn923aSchema.enum('item_status', ['READY', 'PRINTING', 'CUTTING', 'SANDING', 'INSPECTION', 'COMPLETED', 'SHIPPED', 'DISCARD', 'CANCELLED']);
export const machineStatusEnum = sn923aSchema.enum('machine_status', ['READY', 'RUNNING', 'MAINTENANCE']);
export const boxStatusEnum = sn923aSchema.enum('box_status', ['AVAILABLE', 'OCCUPIED']);
export const reasonCodeEnum = sn923aSchema.enum('reason_code', ['OPERATIONAL_ERROR', 'QUALITY_ISSUE', 'EQUIPMENT_FAILURE', 'ORDER_CANCEL']);

export const projects = sn923aSchema.table('projects', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
});

export const units = sn923aSchema.table('units', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').references(() => projects.id).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
});

export const parts = sn923aSchema.table('parts', {
    id: uuid('id').primaryKey().defaultRandom(),
    unitId: uuid('unit_id').references(() => units.id).notNull(),
    partNumber: varchar('part_number', { length: 255 }).notNull(),
    stlUrl: text('stl_url'),
    status: partStatusEnum('status').notNull().default('PENDING'),
});

export const partsRelations = relations(parts, ({ one, many }) => ({
    unit: one(units, {
        fields: [parts.unitId],
        references: [units.id],
    }),
    partItems: many(partItems),
}));

export const boxes = sn923aSchema.table('boxes', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    status: boxStatusEnum('status').notNull().default('AVAILABLE'),
});

export const machines = sn923aSchema.table('machines', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 255 }).notNull(),
    status: machineStatusEnum('status').notNull().default('READY'),
});

export const partItems = sn923aSchema.table('part_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    partId: uuid('part_id').references(() => parts.id).notNull(),
    machineId: uuid('machine_id').references(() => machines.id).notNull(),
    boxId: uuid('box_id').references(() => boxes.id),
    status: itemStatusEnum('status').notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const partItemsRelations = relations(partItems, ({ one }) => ({
    part: one(parts, {
        fields: [partItems.partId],
        references: [parts.id],
    }),
    machine: one(machines, {
        fields: [partItems.machineId],
        references: [machines.id],
    }),
    box: one(boxes, {
        fields: [partItems.boxId],
        references: [boxes.id],
    }),
}));

export const statusHistory = sn923aSchema.table('status_history', {
    id: uuid('id').primaryKey().defaultRandom(),
    partItemId: uuid('part_item_id').references(() => partItems.id).notNull(),
    statusFrom: itemStatusEnum('status_from'), // Can be null for initial creation
    statusTo: itemStatusEnum('status_to').notNull(),
    reasonCode: reasonCodeEnum('reason_code'),
    comment: text('comment'),
    changedAt: timestamp('changed_at').defaultNow().notNull(),
});
