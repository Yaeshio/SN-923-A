import { defineFactory } from '@praha/drizzle-factory';
import { drizzle } from 'drizzle-orm/postgres-js';
import { pgSchema, uuid } from 'drizzle-orm/pg-core';
import { randomUUID } from 'crypto';
import { client } from '../../src/shared/db';
import { assemblies, parts, partInstances } from '../../src/shared/db/schema';

// auth.users は Supabase 側のテーブル。テストDBでは tests/utils/supabaseStub.ts が id だけのスタブを作る。
// 開発DB (実 Supabase) ではファクトリから使わず、Auth Admin API で作ったユーザーの id を ownerId に渡す。
export const authUsersStub = pgSchema('auth').table('users', {
    id: uuid('id').primaryKey(),
});

export const factorySchema = { authUsers: authUsersStub, assemblies, parts, partInstances };

// アプリの db とは同じ接続を共有しつつ、スタブ (auth.users) を含むスキーマで作るファクトリ専用のインスタンス。
// postgres ロール (RLS を受けない) で投入する。
export const factoryDb = drizzle(client, { schema: factorySchema });

export const userFactory = defineFactory({
    schema: factorySchema,
    table: 'authUsers',
    resolver: () => ({
        id: randomUUID(),
    }),
});

export const assemblyFactory = defineFactory({
    schema: factorySchema,
    table: 'assemblies',
    resolver: ({ sequence, use }) => ({
        id: randomUUID(),
        name: `Assembly ${sequence}`,
        ownerId: () => use(userFactory).create().then((user) => user.id),
        createdAt: new Date(),
    }),
});

// 単体で作ると「各パーツは改訂1のインスタンスを持つ」不変条件を満たさない。
// 不変条件を満たしたデータが必要な場合は createTestPart (tests/factories/index.ts) を使うこと。
export const partFactory = defineFactory({
    schema: factorySchema,
    table: 'parts',
    resolver: ({ sequence, use }) => {
        const id = randomUUID();
        return {
            id,
            assemblyId: () => use(assemblyFactory).create().then((assembly) => assembly.id),
            modelName: `part-${sequence}`,
            modelUrl: `test/parts/${id}/part-${sequence}.stl`,
            partsQuantity: 1,
            createdAt: new Date(),
        };
    },
});

export const partInstanceFactory = defineFactory({
    schema: factorySchema,
    table: 'partInstances',
    resolver: ({ sequence, use }) => {
        const id = randomUUID();
        return {
            id,
            partId: () => use(partFactory).create().then((part) => part.id),
            revision: 1,
            instanceName: `part-${sequence}`,
            instanceUrl: `test/parts/${id}/part-${sequence}.stl`,
            changeNote: null,
            createdAt: new Date(),
        };
    },
    traits: {
        // 設計修正を加えた改訂 (rev 2)
        revised: ({ sequence, use }) => {
            const id = randomUUID();
            return {
                id,
                partId: () => use(partFactory).create().then((part) => part.id),
                revision: 2,
                instanceName: `part-${sequence}`,
                instanceUrl: `test/instances/${id}/part-${sequence}.stl`,
                changeNote: 'サポートを追加',
                createdAt: new Date(),
            };
        },
    },
});
