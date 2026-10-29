import { sql, relations } from 'drizzle-orm';
import { check, index, integer, pgPolicy, pgSchema, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { authenticatedRole, authUid, authUsers } from 'drizzle-orm/supabase';

// 設計側 (CAD)。製造側は転記方式で外部キーを張らないため、別スキーマに分離する (specs/05_architecture.md 3.3)
export const designSchema = pgSchema('design');

// 所有者 (assemblies.owner_id) だけが行を CRUD できる。parts / part_instances は親の可視性を継承する。
// 親テーブルの RLS が EXISTS のサブクエリにも適用されるため、他人の行は見えず、他人の親へ子を追加することもできない。
export const assemblies = designSchema.table('assemblies', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    ownerId: uuid('owner_id')
        .notNull()
        .default(sql`auth.uid()`)
        .references(() => authUsers.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    pgPolicy('assemblies_owner_all', {
        for: 'all',
        to: authenticatedRole,
        using: sql`${t.ownerId} = ${authUid}`,
        withCheck: sql`${t.ownerId} = ${authUid}`,
    }),
]).enableRLS();

export const parts = designSchema.table('parts', {
    id: uuid('id').primaryKey().defaultRandom(),
    assemblyId: uuid('assembly_id').references(() => assemblies.id, { onDelete: 'cascade' }).notNull(),
    modelName: text('model_name').notNull(),
    modelUrl: text('model_url').notNull(),
    partsQuantity: integer('parts_quantity').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    check('parts_quantity_positive', sql`${t.partsQuantity} > 0`),
    pgPolicy('parts_via_assembly', {
        for: 'all',
        to: authenticatedRole,
        using: sql`exists (select 1 from ${assemblies} where ${assemblies.id} = ${t.assemblyId})`,
        withCheck: sql`exists (select 1 from ${assemblies} where ${assemblies.id} = ${t.assemblyId})`,
    }),
]).enableRLS();

// 改訂ごとの追記専用レコード。instance_url / revision / change_note は作成後に変更しない (specs/02_data_model.md 5.1)
export const partInstances = designSchema.table('part_instances', {
    id: uuid('id').primaryKey().defaultRandom(),
    partId: uuid('part_id').references(() => parts.id, { onDelete: 'cascade' }).notNull(),
    revision: integer('revision').notNull(),
    instanceName: text('instance_name').notNull(),
    instanceUrl: text('instance_url').notNull(),
    changeNote: text('change_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    unique('part_instances_part_id_revision_unique').on(t.partId, t.revision),
    check('part_instances_revision_positive', sql`${t.revision} >= 1`),
    index('part_instances_part_id_idx').on(t.partId),
    pgPolicy('part_instances_via_part', {
        for: 'all',
        to: authenticatedRole,
        using: sql`exists (select 1 from ${parts} where ${parts.id} = ${t.partId})`,
        withCheck: sql`exists (select 1 from ${parts} where ${parts.id} = ${t.partId})`,
    }),
]).enableRLS();

export const assembliesRelations = relations(assemblies, ({ many }) => ({
    parts: many(parts),
}));

export const partsRelations = relations(parts, ({ one, many }) => ({
    assembly: one(assemblies, {
        fields: [parts.assemblyId],
        references: [assemblies.id],
    }),
    instances: many(partInstances),
}));

export const partInstancesRelations = relations(partInstances, ({ one }) => ({
    part: one(parts, {
        fields: [partInstances.partId],
        references: [parts.id],
    }),
}));
