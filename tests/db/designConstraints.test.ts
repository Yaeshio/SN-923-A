import { describe, it, expect } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { db } from '../../src/shared/db';
import { assemblies, parts, partInstances } from '../../src/shared/db/schema';
import { sqlState } from '../utils/db';
import { createTestAssembly, createTestPart, createTestPartInstance, createTestUser, factoryDb, partInstanceFactory } from '../factories';

// specs/02_data_model.md §8 の制約が、実DBで効いていることを確認する

const UNIQUE_VIOLATION = '23505';
const CHECK_VIOLATION = '23514';
const FK_VIOLATION = '23503';

describe('design スキーマの制約', () => {
    it('(part_id, revision) は一意であること', async () => {
        const { part } = await createTestPart();

        const state = await sqlState(createTestPartInstance({ partId: part.id, revision: 1 }));

        expect(state).toBe(UNIQUE_VIOLATION);
    });

    it('同じパーツでも改訂番号が違えば登録でき、別のパーツなら同じ改訂番号を使えること', async () => {
        const { part } = await createTestPart();
        const other = await createTestPart();

        const rev2 = await createTestPartInstance({ partId: part.id });

        expect(rev2.revision).toBe(2);
        expect(other.instance.revision).toBe(1);
    });

    it.each([0, -1])('revision は 1 以上であること (%s は拒否)', async (revision) => {
        const { part } = await createTestPart();

        const state = await sqlState(createTestPartInstance({ partId: part.id, revision }));

        expect(state).toBe(CHECK_VIOLATION);
    });

    it.each([0, -1])('parts_quantity は 1 以上であること (%s は拒否)', async (partsQuantity) => {
        const state = await sqlState(createTestPart({ partsQuantity }));

        expect(state).toBe(CHECK_VIOLATION);
    });

    it('存在しないアセンブリ・パーツを参照する行は登録できないこと', async () => {
        const missing = '00000000-0000-4000-8000-000000000000';

        expect(await sqlState(createTestPart({ assemblyId: missing }))).toBe(FK_VIOLATION);
        expect(await sqlState(partInstanceFactory(factoryDb).create({ partId: missing }))).toBe(FK_VIOLATION);
    });

    it('アセンブリを削除すると、配下のパーツとインスタンスも削除されること (CASCADE)', async () => {
        const assembly = await createTestAssembly();
        const { part } = await createTestPart({ assemblyId: assembly.id });
        await createTestPartInstance({ partId: part.id });

        await db.delete(assemblies).where(eq(assemblies.id, assembly.id));

        expect(await db.select().from(parts)).toHaveLength(0);
        expect(await db.select().from(partInstances)).toHaveLength(0);
    });

    it('パーツを削除すると、そのインスタンスも削除され、他のパーツは影響を受けないこと (CASCADE)', async () => {
        const assembly = await createTestAssembly();
        const target = await createTestPart({ assemblyId: assembly.id });
        const kept = await createTestPart({ assemblyId: assembly.id });

        await db.delete(parts).where(eq(parts.id, target.part.id));

        const remaining = await db.select().from(partInstances);
        expect(remaining.map((i) => i.id)).toEqual([kept.instance.id]);
    });

    it('ユーザー (auth.users) を削除すると、そのユーザーのアセンブリ以下も削除されること (CASCADE)', async () => {
        const owner = await createTestUser();
        const assembly = await createTestAssembly({ ownerId: owner.id });
        await createTestPart({ assemblyId: assembly.id });

        await db.execute(sql`delete from auth.users where id = ${owner.id}`);

        expect(await db.select().from(assemblies)).toHaveLength(0);
        expect(await db.select().from(parts)).toHaveLength(0);
    });

    it('owner_id は必須で、存在しないユーザーは参照できないこと', async () => {
        const missing = '00000000-0000-4000-8000-000000000000';

        expect(await sqlState(createTestAssembly({ ownerId: missing }))).toBe(FK_VIOLATION);
    });
});
