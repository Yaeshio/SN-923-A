import { describe, it, expect } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { db } from '../../src/shared/db';
import { withUser } from '../../src/shared/db/rls';
import { assemblies, parts, partInstances } from '../../src/shared/db/schema';
import { ValidationError } from '../../src/shared/errors';
import { sqlState } from '../utils/db';
import { createTestAssembly, createTestPart, createTestUser } from '../factories';

// ログインユーザー (authenticated ロール) は自分 (owner) のデータだけを CRUD できる。
// 素の db (postgres ロール) は RLS を受けないため、検証はすべて withUser 経由、または明示的なロール切り替えで行う。

const INSUFFICIENT_PRIVILEGE = '42501';

async function setupTwoUsers() {
    const alice = await createTestUser();
    const bob = await createTestUser();
    const assembly = await createTestAssembly({ ownerId: alice.id, name: 'alice-assembly' });
    const { part, instance } = await createTestPart({ assemblyId: assembly.id });
    return { alice, bob, assembly, part, instance };
}

describe('design スキーマの RLS', () => {
    describe('所有者', () => {
        it('自分のアセンブリ・パーツ・インスタンスを参照できること', async () => {
            const { alice, assembly, part, instance } = await setupTwoUsers();

            const seen = await withUser(alice.id, async (tx) => ({
                assemblies: await tx.select().from(assemblies),
                parts: await tx.select().from(parts),
                instances: await tx.select().from(partInstances),
            }));

            expect(seen.assemblies.map((a) => a.id)).toEqual([assembly.id]);
            expect(seen.parts.map((p) => p.id)).toEqual([part.id]);
            expect(seen.instances.map((i) => i.id)).toEqual([instance.id]);
        });

        it('アセンブリを作ると owner_id が自分になり、配下にパーツとインスタンスを追加・更新・削除できること', async () => {
            const alice = await createTestUser();

            await withUser(alice.id, async (tx) => {
                // owner_id を指定しなくても、DB の既定値 auth.uid() で自分になる
                const [assembly] = await tx.insert(assemblies).values({ name: 'new' }).returning();
                expect(assembly.ownerId).toBe(alice.id);

                const [part] = await tx.insert(parts).values({
                    assemblyId: assembly.id, modelName: 'p', modelUrl: 'u', partsQuantity: 1,
                }).returning();
                const [instance] = await tx.insert(partInstances).values({
                    partId: part.id, revision: 1, instanceName: 'p', instanceUrl: 'u',
                }).returning();

                const [renamed] = await tx.update(assemblies).set({ name: 'renamed' }).where(eq(assemblies.id, assembly.id)).returning();
                expect(renamed.name).toBe('renamed');

                const deleted = await tx.delete(assemblies).where(eq(assemblies.id, assembly.id)).returning();
                expect(deleted).toHaveLength(1);
                // CASCADE により配下も消える
                expect(await tx.select().from(parts).where(eq(parts.id, part.id))).toHaveLength(0);
                expect(await tx.select().from(partInstances).where(eq(partInstances.id, instance.id))).toHaveLength(0);
            });
        });
    });

    describe('他のユーザー', () => {
        it('他人のアセンブリ・パーツ・インスタンスは参照できないこと', async () => {
            const { bob } = await setupTwoUsers();

            const seen = await withUser(bob.id, async (tx) => ({
                assemblies: await tx.select().from(assemblies),
                parts: await tx.select().from(parts),
                instances: await tx.select().from(partInstances),
            }));

            expect(seen).toEqual({ assemblies: [], parts: [], instances: [] });
        });

        it('他人のデータを更新・削除しても 0 件で、データは変わらないこと', async () => {
            const { bob, assembly, part, instance } = await setupTwoUsers();

            await withUser(bob.id, async (tx) => {
                expect(await tx.update(assemblies).set({ name: 'hacked' }).where(eq(assemblies.id, assembly.id)).returning()).toHaveLength(0);
                expect(await tx.update(parts).set({ modelName: 'hacked' }).where(eq(parts.id, part.id)).returning()).toHaveLength(0);
                expect(await tx.delete(partInstances).where(eq(partInstances.id, instance.id)).returning()).toHaveLength(0);
                expect(await tx.delete(parts).where(eq(parts.id, part.id)).returning()).toHaveLength(0);
                expect(await tx.delete(assemblies).where(eq(assemblies.id, assembly.id)).returning()).toHaveLength(0);
            });

            const [stored] = await db.select().from(assemblies).where(eq(assemblies.id, assembly.id));
            expect(stored.name).toBe('alice-assembly');
            expect(await db.select().from(parts)).toHaveLength(1);
            expect(await db.select().from(partInstances)).toHaveLength(1);
        });

        it('他人のアセンブリへパーツを追加できないこと', async () => {
            const { bob, assembly } = await setupTwoUsers();

            const state = await sqlState(withUser(bob.id, (tx) => tx.insert(parts).values({
                assemblyId: assembly.id, modelName: 'x', modelUrl: 'u', partsQuantity: 1,
            })));

            expect(state).toBe(INSUFFICIENT_PRIVILEGE);
            expect(await db.select().from(parts)).toHaveLength(1);
        });

        it('他人のパーツへインスタンス (改訂) を追加できないこと', async () => {
            const { bob, part } = await setupTwoUsers();

            const state = await sqlState(withUser(bob.id, (tx) => tx.insert(partInstances).values({
                partId: part.id, revision: 2, instanceName: 'x', instanceUrl: 'u',
            })));

            expect(state).toBe(INSUFFICIENT_PRIVILEGE);
            expect(await db.select().from(partInstances)).toHaveLength(1);
        });

        it('他人を所有者にしたアセンブリを作れないこと', async () => {
            const { alice, bob } = await setupTwoUsers();

            const state = await sqlState(withUser(bob.id, (tx) => tx.insert(assemblies).values({ name: 'x', ownerId: alice.id })));

            expect(state).toBe(INSUFFICIENT_PRIVILEGE);
        });

        it('自分のアセンブリの所有者を他人に書き換えられないこと', async () => {
            const { alice, bob, assembly } = await setupTwoUsers();

            const state = await sqlState(withUser(alice.id, (tx) => tx.update(assemblies).set({ ownerId: bob.id }).where(eq(assemblies.id, assembly.id))));

            expect(state).toBe(INSUFFICIENT_PRIVILEGE);
        });
    });

    describe('未ログイン', () => {
        it('anon ロールは design スキーマにアクセスできないこと', async () => {
            await setupTwoUsers();

            const state = await sqlState(db.transaction(async (tx) => {
                await tx.execute(sql`set local role anon`);
                await tx.select().from(assemblies);
            }));

            expect(state).toBe(INSUFFICIENT_PRIVILEGE);
        });

        it('JWT claims が無い authenticated ロールは、何も参照できないこと', async () => {
            await setupTwoUsers();

            const seen = await db.transaction(async (tx) => {
                await tx.execute(sql`set local role authenticated`);
                return tx.select().from(assemblies);
            });

            expect(seen).toEqual([]);
        });
    });

    describe('withUser', () => {
        it('UUID でないユーザーIDは ValidationError となり、DB を呼ばないこと', async () => {
            await expect(withUser('not-a-uuid', async () => 'unreachable')).rejects.toThrow(ValidationError);
        });

        it('トランザクションの終了後、ロールと claims がコネクションに残らないこと', async () => {
            const { alice } = await setupTwoUsers();

            // コネクションプールを一巡させる
            for (let i = 0; i < 12; i++) {
                await withUser(alice.id, async (tx) => tx.select().from(assemblies));
            }
            for (let i = 0; i < 12; i++) {
                const [row] = await db.execute<{ current_user: string; sub: string | null }>(
                    sql`select current_user, nullif(current_setting('request.jwt.claim.sub', true), '') as sub`,
                );
                expect(row.current_user).toBe('postgres');
                expect(row.sub).toBeNull();
            }
        });

        it('fn が例外を投げるとロールバックされること', async () => {
            const alice = await createTestUser();

            await expect(withUser(alice.id, async (tx) => {
                await tx.insert(assemblies).values({ name: 'will-rollback' });
                throw new Error('boom');
            })).rejects.toThrow('boom');

            expect(await db.select().from(assemblies)).toHaveLength(0);
        });
    });
});
