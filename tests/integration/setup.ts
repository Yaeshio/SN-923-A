import { afterAll, inject } from 'vitest';

// src/shared/db は import 時に DATABASE_URL を読むため、テストファイルが import するより前に、接続先を supabase start のDBにする。
// tests/setup.ts と違い、beforeEach で clearDb (TRUNCATE) は行わない: 開発用スタックの auth.users と design を消してしまうため。
// 後始末は、各テストが作ったユーザーを helpers の createUserTracker で個別に削除する。
process.env.DATABASE_URL = inject('supabase').dbUrl;

afterAll(async () => {
    const { client } = await import('../../src/shared/db');
    await client.end();
});
