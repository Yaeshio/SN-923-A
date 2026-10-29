import { asc, desc, eq } from 'drizzle-orm';
import { withUser } from '../../../shared/db/rls';
import { assemblies, partInstances, parts } from '../../../shared/db/schema';
import { isUuid } from '../../../shared/lib/uuid';

// アセンブリの読み取り・作成。単一テーブル中心の操作のためパイプラインは経由しない (specs/04_logic_api.md 1.9)。
// すべて withUser 経由のため、ログインユーザー自身のアセンブリだけが対象になる。
export const AssemblyService = {
    list: (userId: string) =>
        withUser(userId, (tx) => tx.query.assemblies.findMany({
            orderBy: desc(assemblies.createdAt),
            with: { parts: { columns: { id: true } } },
        })),

    create: (userId: string, name: string) =>
        withUser(userId, async (tx) => {
            // owner_id は DB の既定値 auth.uid() に任せ、RLS の WITH CHECK で保証する
            const [assembly] = await tx.insert(assemblies).values({ name }).returning();
            return assembly;
        }),

    // パーツと、各パーツの改訂 (新しい順) を返す。見つからない/他人のものなら undefined
    getWithParts: async (userId: string, assemblyId: string) => {
        if (!isUuid(assemblyId)) return undefined;
        return withUser(userId, (tx) => tx.query.assemblies.findFirst({
            where: eq(assemblies.id, assemblyId),
            with: {
                parts: {
                    orderBy: asc(parts.createdAt),
                    with: { instances: { orderBy: desc(partInstances.revision) } },
                },
            },
        }));
    },
};
