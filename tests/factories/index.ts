import { eq, sql } from 'drizzle-orm';
import { db } from '../../src/shared/db';
import { assemblies, parts, partInstances } from '../../src/shared/db/schema';
import { assemblyFactory, factoryDb, partFactory, partInstanceFactory, userFactory } from './factories';

export * from './factories';

// ファクトリは素の postgres ロール (RLS を受けない) で投入する。
// アセンブリの所有者を指定しない場合は、新しいユーザー (auth.users のスタブ) が自動で作られる。

type AssemblyInsert = Partial<typeof assemblies.$inferInsert>;
type PartInsert = Partial<typeof parts.$inferInsert>;
type PartInstanceInsert = Partial<typeof partInstances.$inferInsert>;

export async function createTestUser(overrides?: { id?: string }): Promise<{ id: string }> {
    return userFactory(factoryDb).create(overrides ?? {}) as Promise<{ id: string }>;
}

export async function createTestAssembly(overrides?: AssemblyInsert): Promise<typeof assemblies.$inferSelect> {
    return assemblyFactory(factoryDb).create(overrides ?? {}) as Promise<typeof assemblies.$inferSelect>;
}

/**
 * パーツと、その改訂 1 のインスタンスを同一トランザクションで作る (ImportPipeline と同じ不変条件)。
 * 改訂 1 のインスタンスは、パーツ名とファイルパスをコピーし、change_note は NULL。
 */
export async function createTestPart(overrides?: PartInsert & { instanceOverrides?: PartInstanceInsert }) {
    const { instanceOverrides, ...partOverrides } = overrides ?? {};
    return factoryDb.transaction(async (tx) => {
        const part = await partFactory(tx).create(partOverrides) as typeof parts.$inferSelect;
        const instance = await partInstanceFactory(tx).create({
            partId: part.id,
            revision: 1,
            instanceName: part.modelName,
            instanceUrl: part.modelUrl,
            changeNote: null,
            ...instanceOverrides,
        }) as typeof partInstances.$inferSelect;
        return { part, instance };
    });
}

/** 指定したパーツに新しい改訂 (最大の改訂番号 + 1) を追加する。 */
export async function createTestPartInstance(overrides: PartInstanceInsert & { partId: string }): Promise<typeof partInstances.$inferSelect> {
    const part = await db.query.parts.findFirst({ where: eq(parts.id, overrides.partId) });
    if (!part) {
        throw new Error(`Part not found: ${overrides.partId}`);
    }
    const [{ max }] = await db
        .select({ max: sql<number>`coalesce(max(${partInstances.revision}), 0)::int` })
        .from(partInstances)
        .where(eq(partInstances.partId, overrides.partId));

    const revision = max + 1;
    return partInstanceFactory(factoryDb).create({
        revision,
        instanceName: part.modelName,
        instanceUrl: `test/instances/${part.id}/rev${revision}.stl`,
        changeNote: 'テスト用の設計修正',
        ...overrides,
    }) as Promise<typeof partInstances.$inferSelect>;
}
