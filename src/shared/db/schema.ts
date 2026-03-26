import { pgTable, text, timestamp, varchar, pgEnum, uuid } from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';

// Enums
export const partStatusEnum = pgEnum('part_status', ['PENDING', 'ACTIVE']);
export const itemStatusEnum = pgEnum('item_status', ['READY', 'PRINTING', 'CUTTING', 'SANDING', 'INSPECTION', 'COMPLETED', 'SHIPPED', 'DISCARD', 'CANCELLED']);
export const machineStatusEnum = pgEnum('machine_status', ['READY', 'RUNNING', 'MAINTENANCE']);
export const boxStatusEnum = pgEnum('box_status', ['AVAILABLE', 'OCCUPIED']);
export const reasonCodeEnum = pgEnum('reason_code', ['OPERATIONAL_ERROR', 'QUALITY_ISSUE', 'EQUIPMENT_FAILURE', 'ORDER_CANCEL']);

export const projects = pgTable('projects', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
});

export const units = pgTable('units', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').references(() => projects.id).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
});

export const parts = pgTable('parts', {
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

export const boxes = pgTable('boxes', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    status: boxStatusEnum('status').notNull().default('AVAILABLE'),
});

export const machines = pgTable('machines', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 255 }).notNull(),
    status: machineStatusEnum('status').notNull().default('READY'),
});

export const partItems = pgTable('part_items', {
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

export const statusHistory = pgTable('status_history', {
    id: uuid('id').primaryKey().defaultRandom(),
    partItemId: uuid('part_item_id').references(() => partItems.id).notNull(),
    statusFrom: itemStatusEnum('status_from'), // Can be null for initial creation
    statusTo: itemStatusEnum('status_to').notNull(),
    reasonCode: reasonCodeEnum('reason_code'),
    comment: text('comment'),
    changedAt: timestamp('changed_at').defaultNow().notNull(),
});
