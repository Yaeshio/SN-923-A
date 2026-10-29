import { describe, it, expect } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { db } from '../../src/shared/db';
import { assemblies, parts, partInstances } from '../../src/shared/db/schema';
import {
    createTestAssembly,
    createTestPart,
    createTestPartInstance,
    createTestUser,
    factoryDb,
    partInstanceFactory,
} from './index';
import { seedDesignSamples } from './seed';

describe('テスト用ファクトリ', () => {
    it('createTestAssembly: 所有者を指定しなければ、新しいユーザーが作られて所有者になること', async () => {
        const assembly = await createTestAssembly();

        const [{ count }] = await db.execute<{ count: number }>(sql`select count(*)::int as count from auth.users where id = ${assembly.ownerId}`);
        expect(count).toBe(1);
        expect(await db.select().from(assemblies)).toHaveLength(1);
    });

    it('createTestAssembly: 指定した値を上書きできること', async () => {
        const owner = await createTestUser();

        const assembly = await createTestAssembly({ name: 'my assembly', ownerId: owner.id });

        expect(assembly.name).toBe('my assembly');
        expect(assembly.ownerId).toBe(owner.id);
    });

    it('createTestPart: パーツと改訂1のインスタンスが同時に作られ、名前とパスがコピーされること', async () => {
        const { part, instance } = await createTestPart({ modelName: 'bracket', partsQuantity: 4 });

        expect(part.partsQuantity).toBe(4);
        expect(instance.partId).toBe(part.id);
        expect(instance.revision).toBe(1);
        expect(instance.instanceName).toBe('bracket');
        expect(instance.instanceUrl).toBe(part.modelUrl);
        expect(instance.changeNote).toBeNull();
        expect(await db.select().from(parts)).toHaveLength(1);
        expect(await db.select().from(partInstances)).toHaveLength(1);
    });

    it('createTestPart: アセンブリを指定すれば、その配下に作られること', async () => {
        const assembly = await createTestAssembly();

        const { part } = await createTestPart({ assemblyId: assembly.id });

        expect(part.assemblyId).toBe(assembly.id);
        expect(await db.select().from(assemblies)).toHaveLength(1);
    });

    it('createTestPartInstance: 改訂番号が 2, 3, ... と連番で増えること', async () => {
        const { part } = await createTestPart();

        const rev2 = await createTestPartInstance({ partId: part.id });
        const rev3 = await createTestPartInstance({ partId: part.id, changeNote: '公差補正' });

        expect([rev2.revision, rev3.revision]).toEqual([2, 3]);
        expect(rev3.changeNote).toBe('公差補正');
        expect(rev2.instanceName).toBe(part.modelName);
        const stored = await db.select().from(partInstances).where(eq(partInstances.partId, part.id));
        expect(stored.map((i) => i.revision).sort()).toEqual([1, 2, 3]);
    });

    it('partInstanceFactory: revised トレイトは改訂2と修正メモを持つこと', async () => {
        const instance = await partInstanceFactory(factoryDb).traits.revised.create();

        expect(instance.revision).toBe(2);
        expect(instance.changeNote).toBe('サポートを追加');
    });

    it('seedDesignSamples: 1アセンブリ・3パーツ・4インスタンス (うち1つは改訂2) が作られること', async () => {
        const owner = await createTestUser();

        const { assembly, parts: created } = await seedDesignSamples(owner.id);

        expect(assembly.ownerId).toBe(owner.id);
        expect(created).toHaveLength(3);
        expect(await db.select().from(assemblies)).toHaveLength(1);
        expect(await db.select().from(parts)).toHaveLength(3);
        const instances = await db.select().from(partInstances);
        expect(instances).toHaveLength(4);
        expect(instances.filter((i) => i.revision === 2)).toHaveLength(1);
    });
});
