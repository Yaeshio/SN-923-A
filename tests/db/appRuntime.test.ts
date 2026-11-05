import { randomUUID } from 'crypto';
import { describe, it, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '../../src/shared/db';
import { adminDb } from '../../src/shared/db/admin';
import { withUser } from '../../src/shared/db/rls';
import { assemblies } from '../../src/shared/db/schema';
import { sqlState } from '../utils/db';
import { createTestAssembly, createTestPart } from '../factories';

// アプリの接続ロール app_runtime (supabase/migrations/*_create_app_runtime_role.sql) の検証。
// 「withUser を使い忘れても RLS が黙ってバイパスされる」ことを、規約ではなく DB の権限で防げていること:
// app_runtime は design スキーマの権限を直接持たないので、withUser を通さないクエリは permission denied になる。
// db はアプリ用 (DATABASE_URL = app_runtime)、adminDb は管理用 (DATABASE_ADMIN_URL = postgres)。

const INSUFFICIENT_PRIVILEGE = '42501';
const DESIGN_TABLES = ['assemblies', 'parts', 'part_instances'] as const;

describe('app_runtime ロール', () => {
    describe('ロールの定義', () => {
        it('RLS をバイパスできず、権限を暗黙に引き継がない、LOGIN 専用のロールであること', async () => {
            const [role] = await adminDb.execute<Record<string, boolean>>(sql`
                select rolsuper, rolbypassrls, rolinherit, rolcanlogin, rolcreaterole, rolcreatedb, rolreplication
                from pg_roles where rolname = 'app_runtime'
            `);

            expect(role).toEqual({
                rolsuper: false,
                rolbypassrls: false,
                rolinherit: false,
                rolcanlogin: true,
                rolcreaterole: false,
                rolcreatedb: false,
                rolreplication: false,
            });
        });

        it('authenticated へ切り替えられるが、その権限は引き継がないこと', async () => {
            const [membership] = await adminDb.execute<{ member: boolean; usage: boolean; set: boolean }>(sql`
                select pg_has_role('app_runtime', 'authenticated', 'member') as member,
                       pg_has_role('app_runtime', 'authenticated', 'usage') as usage,
                       pg_has_role('app_runtime', 'authenticated', 'set') as "set"
            `);

            // member: メンバーである / set: SET ROLE できる / usage: 権限を自動で引き継ぐ (これは false)
            expect(membership).toEqual({ member: true, set: true, usage: false });
        });

        it('アプリの接続 (db) が実際に app_runtime で接続していること', async () => {
            const [row] = await db.execute<{ current_user: string; session_user: string }>(sql`select current_user, session_user`);

            expect(row).toEqual({ current_user: 'app_runtime', session_user: 'app_runtime' });
        });

        it('design スキーマとそのテーブルに、直接の権限を持たないこと', async () => {
            const [schemaPrivilege] = await adminDb.execute<{ usage: boolean }>(
                sql`select has_schema_privilege('app_runtime', 'design', 'USAGE') as usage`,
            );
            expect(schemaPrivilege.usage).toBe(false);

            for (const table of DESIGN_TABLES) {
                const [tablePrivilege] = await adminDb.execute<{ any: boolean }>(sql`
                    select has_table_privilege('app_runtime', ${`design.${table}`}, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') as "any"
                `);
                expect(tablePrivilege.any, `design.${table}`).toBe(false);
            }
        });

        it('auth スキーマのユーザー情報も、直接は読めないこと', async () => {
            const [row] = await adminDb.execute<{ readable: boolean }>(
                sql`select has_table_privilege('app_runtime', 'auth.users', 'SELECT') as readable`,
            );

            expect(row.readable).toBe(false);
        });

        it('スキーマやテーブルを作れないこと', async () => {
            expect(await sqlState(db.execute(sql`create table public.app_runtime_probe (id int)`))).toBe(INSUFFICIENT_PRIVILEGE);
            expect(await sqlState(db.execute(sql`create schema app_runtime_probe`))).toBe(INSUFFICIENT_PRIVILEGE);
        });
    });

    describe('withUser を通さない素の db', () => {
        it.each(DESIGN_TABLES)('design.%s の SELECT / INSERT / UPDATE / DELETE がすべて permission denied になり、データは変わらないこと', async (table) => {
            const assembly = await createTestAssembly({ name: 'owned' });
            await createTestPart({ assemblyId: assembly.id });
            const target = sql.raw(`design.${table}`);

            const states = await Promise.all([
                sqlState(db.execute(sql`select * from ${target}`)),
                sqlState(db.execute(sql`insert into ${target} default values`)),
                sqlState(db.execute(sql`update ${target} set created_at = now()`)),
                sqlState(db.execute(sql`delete from ${target}`)),
            ]);

            expect(states).toEqual([INSUFFICIENT_PRIVILEGE, INSUFFICIENT_PRIVILEGE, INSUFFICIENT_PRIVILEGE, INSUFFICIENT_PRIVILEGE]);
            // 何も消えて (書き換わって) いない
            const [{ count }] = await adminDb.execute<{ count: number }>(sql`select count(*)::int as count from ${target}`);
            expect(count).toBe(1);
        });

        it('アプリのコードと同じ Drizzle のクエリでも拒否されること (RLS が黙ってバイパスされない)', async () => {
            await createTestAssembly();

            expect(await sqlState(db.select().from(assemblies))).toBe(INSUFFICIENT_PRIVILEGE);
            expect(await sqlState(db.insert(assemblies).values({ name: 'x', ownerId: randomUUID() }))).toBe(INSUFFICIENT_PRIVILEGE);
            expect(await sqlState(db.delete(assemblies))).toBe(INSUFFICIENT_PRIVILEGE);
        });

        it('トランザクション内でも、authenticated へ切り替えずに使えば拒否されること', async () => {
            await createTestAssembly();

            const state = await sqlState(db.transaction((tx) => tx.select().from(assemblies)));

            expect(state).toBe(INSUFFICIENT_PRIVILEGE);
        });
    });

    describe('withUser 経由', () => {
        it('セッションは app_runtime のまま、トランザクションの間だけ authenticated で動くこと', async () => {
            const assembly = await createTestAssembly();

            const inside = await withUser(assembly.ownerId, async (tx) => {
                const [row] = await tx.execute<{ current_user: string; session_user: string }>(sql`select current_user, session_user`);
                return row;
            });

            expect(inside).toEqual({ current_user: 'authenticated', session_user: 'app_runtime' });
        });

        it('所有者として自分のデータを読み書きできること', async () => {
            const assembly = await createTestAssembly({ name: 'mine' });

            const seen = await withUser(assembly.ownerId, async (tx) => {
                await tx.insert(assemblies).values({ name: 'added' });
                return tx.select().from(assemblies);
            });

            expect(seen.map((a) => a.name).sort()).toEqual(['added', 'mine']);
        });

        it('RESET ROLE しても、戻り先の app_runtime には権限がなく、RLS をバイパスできないこと', async () => {
            const assembly = await createTestAssembly();

            const state = await sqlState(withUser(assembly.ownerId, async (tx) => {
                await tx.execute(sql`reset role`);
                await tx.select().from(assemblies);
            }));

            expect(state).toBe(INSUFFICIENT_PRIVILEGE);
        });

        it('postgres などの別ロールへは切り替えられないこと', async () => {
            const assembly = await createTestAssembly();

            for (const role of ['postgres', 'anon']) {
                const state = await sqlState(withUser(assembly.ownerId, (tx) => tx.execute(sql.raw(`set local role ${role}`))));
                expect(state, role).toBe(INSUFFICIENT_PRIVILEGE);
            }
        });
    });
});
