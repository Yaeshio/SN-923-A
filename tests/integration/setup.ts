import { afterAll, inject } from 'vitest';

// src/shared/db と src/shared/db/admin は import 時に環境変数を読むため、テストファイルが import するより前に、接続先を supabase start のDBにする。
// アプリ用 (DATABASE_URL) は app_runtime、管理用 (DATABASE_ADMIN_URL) は postgres。
// tests/setup.ts と違い、beforeEach で clearDb (TRUNCATE) は行わない: 開発用スタックの auth.users と design を消してしまうため。
// 後始末は、各テストが作ったユーザーを helpers の createUserTracker で個別に削除する。
process.env.DATABASE_URL = inject('supabase').appDbUrl;
process.env.DATABASE_ADMIN_URL = inject('supabase').dbUrl;

afterAll(async () => {
    const { client } = await import('../../src/shared/db');
    const { adminClient } = await import('../../src/shared/db/admin');
    await Promise.all([client.end(), adminClient.end()]);
});
