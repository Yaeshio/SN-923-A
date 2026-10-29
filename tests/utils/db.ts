import { db, client } from '../../src/shared/db';
import { sql } from 'drizzle-orm';

// Utility to clear all data
export async function clearDb() {
    // Using TRUNCATE with CASCADE is more robust than individual deletes.
    // auth.users はテストDBのスタブ (tests/utils/supabaseStub.ts)。assemblies.owner_id の参照元なので一緒に空にする。
    await db.execute(sql`
        TRUNCATE TABLE
            "design"."part_instances",
            "design"."parts",
            "design"."assemblies",
            "auth"."users"
        RESTART IDENTITY CASCADE;
    `);
}

export async function teardownDb() {
    // Close the connection to prevent Vitest from hanging
    await client.end();
}

// drizzle は DB エラーを DrizzleQueryError で包むため、cause (pg のエラー) の SQLSTATE を取り出す。
// 成功した場合は undefined。
export async function sqlState(promise: Promise<unknown>): Promise<string | undefined> {
    try {
        await promise;
    } catch (error: any) {
        return error.cause?.code ?? error.code;
    }
    return undefined;
}
