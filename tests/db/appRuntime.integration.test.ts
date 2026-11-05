import { afterEach, describe, it, expect } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { db } from '../../src/shared/db';
import { adminDb } from '../../src/shared/db/admin';
import { withUser } from '../../src/shared/db/rls';
import { assemblies } from '../../src/shared/db/schema';
import { sqlState } from '../utils/db';
import { createUserTracker } from '../integration/helpers';

// Supabase結合層: 実 Supabase (supabase start、PG17) 上の app_runtime ロールの検証。`npx supabase start` が前提。
// DB結合 (appRuntime.test.ts) のテストDBは素の PostgreSQL に Supabase のロールをスタブで作っているだけなので、
// 実環境で「GRANT authenticated が通ること」「実 Auth のユーザーで withUser が動くこと」
// 「Supabase が既定で付ける権限 (PUBLIC や default privileges) 経由で、アプリのデータに届かないこと」をここで確認する。
// db はアプリ用 (app_runtime)、adminDb は管理用 (postgres)。接続先は tests/integration/setup.ts が設定する。

const INSUFFICIENT_PRIVILEGE = '42501';

// アプリのデータや、他のアプリ・ユーザー情報があるスキーマ。app_runtime が直接読み書きできるテーブルがあってはならない。
// (net は Supabase 管理の pg_net。PUBLIC への既定の付与で、アプリのデータとは無関係なので対象外)
const GUARDED_SCHEMAS = ['design', 'sn923a', 'public', 'auth', 'storage'];

describe('app_runtime ロール (実 Supabase)', () => {
    const users = createUserTracker();

    afterEach(async () => {
        await users.cleanup();
    });

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

        it('authenticated へ切り替えられるが、その権限は引き継がないこと (GRANT が実環境で通っている)', async () => {
            const [membership] = await adminDb.execute<{ member: boolean; usage: boolean; set: boolean }>(sql`
                select pg_has_role('app_runtime', 'authenticated', 'member') as member,
                       pg_has_role('app_runtime', 'authenticated', 'usage') as usage,
                       pg_has_role('app_runtime', 'authenticated', 'set') as "set"
            `);

            expect(membership).toEqual({ member: true, set: true, usage: false });
        });

        it('アプリの接続 (db) が実際に app_runtime で接続していること', async () => {
            const [row] = await db.execute<{ current_user: string; session_user: string }>(sql`select current_user, session_user`);

            expect(row).toEqual({ current_user: 'app_runtime', session_user: 'app_runtime' });
        });

        it('design・auth・storage・public など、アプリやユーザーのデータがあるスキーマのテーブルを、直接は読み書きできないこと', async () => {
            const reachable = await adminDb.execute<{ schema: string; name: string }>(sql`
                select c.relnamespace::regnamespace::text as schema, c.relname as name
                from pg_class c
                where c.relkind in ('r', 'v', 'm', 'p', 'f')
                  and c.relnamespace::regnamespace::text in (${sql.join(GUARDED_SCHEMAS.map((s) => sql`${s}`), sql`, `)})
                  and has_table_privilege('app_runtime', c.oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE')
            `);

            expect(reachable).toEqual([]);
        });

        it('スキーマやテーブルを作れないこと (public にも作れない)', async () => {
            expect(await sqlState(db.execute(sql`create table public.app_runtime_probe (id int)`))).toBe(INSUFFICIENT_PRIVILEGE);
            expect(await sqlState(db.execute(sql`create table design.app_runtime_probe (id int)`))).toBe(INSUFFICIENT_PRIVILEGE);
            expect(await sqlState(db.execute(sql`create schema app_runtime_probe`))).toBe(INSUFFICIENT_PRIVILEGE);
        });
    });

    describe('withUser を通さない素の db', () => {
        it('design のテーブルの SELECT / INSERT / UPDATE / DELETE がすべて permission denied になり、データは変わらないこと', async () => {
            const owner = await users.create();
            const created = await withUser(owner.id, async (tx) => (await tx.insert(assemblies).values({ name: 'owned' }).returning())[0]);

            const states = await Promise.all([
                sqlState(db.select().from(assemblies)),
                sqlState(db.insert(assemblies).values({ name: 'x', ownerId: owner.id })),
                sqlState(db.update(assemblies).set({ name: 'hacked' })),
                sqlState(db.delete(assemblies)),
            ]);

            expect(states).toEqual([INSUFFICIENT_PRIVILEGE, INSUFFICIENT_PRIVILEGE, INSUFFICIENT_PRIVILEGE, INSUFFICIENT_PRIVILEGE]);
            const stored = await adminDb.select().from(assemblies).where(eq(assemblies.id, created.id));
            expect(stored.map((a) => a.name)).toEqual(['owned']);
        });
    });

    describe('withUser 経由 (実 Auth のユーザー)', () => {
        it('セッションは app_runtime のまま、トランザクションの間だけ authenticated で動くこと', async () => {
            const user = await users.create();

            const inside = await withUser(user.id, async (tx) => {
                const [row] = await tx.execute<{ current_user: string; session_user: string; uid: string }>(
                    sql`select current_user, session_user, auth.uid()::text as uid`,
                );
                return row;
            });

            expect(inside).toEqual({ current_user: 'authenticated', session_user: 'app_runtime', uid: user.id });
        });

        it('所有者として自分のデータを読み書きでき、他人のデータは見えないこと', async () => {
            const alice = await users.create();
            const bob = await users.create();

            await withUser(alice.id, (tx) => tx.insert(assemblies).values({ name: 'alice-assembly' }));

            const aliceSees = await withUser(alice.id, (tx) => tx.select().from(assemblies));
            const bobSees = await withUser(bob.id, (tx) => tx.select().from(assemblies));

            expect(aliceSees.map((a) => a.name)).toEqual(['alice-assembly']);
            expect(aliceSees[0].ownerId).toBe(alice.id);
            expect(bobSees).toEqual([]);
        });

        it('RESET ROLE しても、戻り先の app_runtime には権限がなく、RLS をバイパスできないこと', async () => {
            const user = await users.create();

            const state = await sqlState(withUser(user.id, async (tx) => {
                await tx.execute(sql`reset role`);
                await tx.select().from(assemblies);
            }));

            expect(state).toBe(INSUFFICIENT_PRIVILEGE);
        });

        it('postgres・service_role・anon などの別ロールへは切り替えられないこと', async () => {
            const user = await users.create();

            for (const role of ['postgres', 'service_role', 'anon', 'supabase_admin']) {
                const state = await sqlState(withUser(user.id, (tx) => tx.execute(sql.raw(`set local role ${role}`))));
                expect(state, role).toBe(INSUFFICIENT_PRIVILEGE);
            }
        });
    });
});
