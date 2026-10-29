import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// 開発DB (.env.local) に、開発用ユーザーとサンプルの設計データを投入する。
// tsx 実行時は Next.js の env 読み込みが効かないため、db を import する前に自分で読み込む。
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const DEV_USER_EMAIL = process.env.SEED_USER_EMAIL ?? 'dev@example.com';
const DEV_USER_PASSWORD = process.env.SEED_USER_PASSWORD ?? 'password123';

// ローカルの Supabase (supabase start) が使うデモ用サービスロールキー。本番では必ず環境変数で渡すこと。
const LOCAL_DEMO_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

async function ensureDevUser(): Promise<string> {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set in .env.local');
    const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY ?? LOCAL_DEMO_SERVICE_ROLE_KEY);

    const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listError) throw listError;
    const existing = list.users.find((user) => user.email === DEV_USER_EMAIL);
    if (existing) return existing.id;

    const { data, error } = await supabase.auth.admin.createUser({
        email: DEV_USER_EMAIL,
        password: DEV_USER_PASSWORD,
        email_confirm: true,
    });
    if (error) throw error;
    return data.user.id;
}

async function seed() {
    console.log('Seeding database...');

    const ownerId = await ensureDevUser();
    console.log(`Dev user: ${DEV_USER_EMAIL} (password: ${DEV_USER_PASSWORD}) [${ownerId}]`);

    // env を読み込んだ後に db を初期化するため、動的に import する
    const { seedDesignSamples } = await import('./factories/seed');
    const { client } = await import('../src/shared/db');

    const { assembly, parts } = await seedDesignSamples(ownerId);
    console.log(`Assembly created: ${assembly.name} (parts: ${parts.map((p) => p.part.modelName).join(', ')})`);

    await client.end();
    console.log('Seeding completed successfully!');
}

seed().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
