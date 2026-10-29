import { describe, it, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import { getTableConfig, type PgTable } from 'drizzle-orm/pg-core';
import { db } from '../../src/shared/db';
import { assemblies, parts, partInstances } from '../../src/shared/db/schema';

// supabase/migrations の SQL は schema.ts から手で整えて作っている。
// Drizzle の定義 (アプリが型として信じているもの) と、実DBに作られたものがずれていないことを確認する。

const tables: Record<string, PgTable> = { assemblies, parts, part_instances: partInstances };

async function rows<T extends Record<string, unknown>>(query: ReturnType<typeof sql>) {
    return (await db.execute<T>(query)) as unknown as T[];
}

describe('Drizzle のスキーマ定義と実DB (migration) の一致', () => {
    describe.each(Object.entries(tables))('%s', (tableName, table) => {
        const config = getTableConfig(table);

        it('カラム名と NOT NULL が一致すること', async () => {
            const actual = await rows<{ column_name: string; is_nullable: string }>(sql`
                select column_name, is_nullable from information_schema.columns
                where table_schema = 'design' and table_name = ${tableName}
            `);

            const expected = config.columns.map((c) => ({ column_name: c.name, is_nullable: c.notNull ? 'NO' : 'YES' }));
            const byName = (a: { column_name: string }, b: { column_name: string }) => a.column_name.localeCompare(b.column_name);
            expect(actual.sort(byName)).toEqual(expected.sort(byName));
        });

        it('制約・外部キー・インデックス・ポリシーが存在し、RLS が有効であること', async () => {
            const constraints = (await rows<{ conname: string }>(sql`
                select conname from pg_constraint where conrelid = ${`design.${tableName}`}::regclass
            `)).map((r) => r.conname);
            const indexes = (await rows<{ indexname: string }>(sql`
                select indexname from pg_indexes where schemaname = 'design' and tablename = ${tableName}
            `)).map((r) => r.indexname);
            const policies = (await rows<{ policyname: string }>(sql`
                select policyname from pg_policies where schemaname = 'design' and tablename = ${tableName}
            `)).map((r) => r.policyname);
            const [{ relrowsecurity }] = await rows<{ relrowsecurity: boolean }>(sql`
                select relrowsecurity from pg_class where oid = ${`design.${tableName}`}::regclass
            `);

            for (const check of config.checks) expect(constraints).toContain(check.name);
            for (const fk of config.foreignKeys) expect(constraints).toContain(fk.getName());
            for (const unique of config.uniqueConstraints) expect(constraints).toContain(unique.name);
            for (const index of config.indexes) expect(indexes).toContain(index.config.name);
            expect(policies.sort()).toEqual(config.policies.map((p) => p.name).sort());
            expect(relrowsecurity).toBe(true);
        });
    });

    it('すべてのポリシーに USING と WITH CHECK の式があること (drizzle-kit push はこれを落とすため、push では作らない)', async () => {
        const policies = await rows<{ policyname: string; qual: string | null; with_check: string | null; roles: string }>(sql`
            select policyname, qual, with_check, roles::text from pg_policies where schemaname = 'design'
        `);

        expect(policies).toHaveLength(3);
        for (const policy of policies) {
            expect(policy.qual, `${policy.policyname}.qual`).toBeTruthy();
            expect(policy.with_check, `${policy.policyname}.with_check`).toBeTruthy();
            expect(policy.roles).toBe('{authenticated}');
        }
    });

    it('anon にはスキーマの権限がなく、authenticated には CRUD の権限があること', async () => {
        const [{ anon_usage, auth_usage }] = await rows<{ anon_usage: boolean; auth_usage: boolean }>(sql`
            select has_schema_privilege('anon', 'design', 'USAGE') as anon_usage,
                   has_schema_privilege('authenticated', 'design', 'USAGE') as auth_usage
        `);
        expect(anon_usage).toBe(false);
        expect(auth_usage).toBe(true);

        for (const tableName of Object.keys(tables)) {
            const [{ privileges }] = await rows<{ privileges: string }>(sql`
                select string_agg(privilege_type, ',' order by privilege_type) as privileges
                from information_schema.role_table_grants
                where table_schema = 'design' and table_name = ${tableName} and grantee = 'authenticated'
            `);
            expect(privileges).toBe('DELETE,INSERT,SELECT,UPDATE');
        }
    });
});
