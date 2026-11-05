import { sql } from 'drizzle-orm';
import { db } from './index';
import { ValidationError } from '../errors';
import { isUuid } from '../lib/uuid';

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * ログインユーザーとしてトランザクションを実行し、Postgres の RLS をアプリのクエリにも効かせる。
 *
 * `db` は専用ロール `app_runtime` (NOBYPASSRLS) で接続している。`app_runtime` は design スキーマの権限を直接持たず、
 * `authenticated` へ切り替えられるだけなので、この関数を通さないクエリは permission denied になる。
 * トランザクション内で `authenticated` ロールへ切り替え、auth.uid() が参照する JWT claims を設定する。
 * すべて LOCAL なのでコミット/ロールバックで元に戻り、コネクションプールへは漏れない。
 * (万一 RESET ROLE されても、戻り先は権限のない `app_runtime` であり、`postgres` のように RLS をバイパスできない)
 *
 * アプリコードの DB アクセスは必ずこの関数を経由すること。テスト・seed・管理処理は `./admin` の `adminDb` を使う。
 */
export async function withUser<T>(userId: string, fn: (tx: DbTransaction) => Promise<T>): Promise<T> {
    if (!isUuid(userId)) {
        throw new ValidationError('Invalid user id');
    }

    return db.transaction(async (tx) => {
        const claims = JSON.stringify({ sub: userId, role: 'authenticated' });
        await tx.execute(sql`select set_config('request.jwt.claims', ${claims}, true), set_config('request.jwt.claim.sub', ${userId}, true)`);
        await tx.execute(sql`set local role authenticated`);
        return fn(tx);
    });
}
