import { sql } from 'drizzle-orm';
import { db } from './index';
import { ValidationError } from '../errors';
import { isUuid } from '../lib/uuid';

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * ログインユーザーとしてトランザクションを実行し、Postgres の RLS をアプリのクエリにも効かせる。
 *
 * `db` は postgres ロール (テーブル所有者 / BYPASSRLS) で接続しているため、そのままでは RLS を受けない。
 * トランザクション内で `authenticated` ロールへ切り替え、auth.uid() が参照する JWT claims を設定する。
 * すべて LOCAL なのでコミット/ロールバックで元に戻り、コネクションプールへは漏れない。
 *
 * アプリコードの DB アクセスは必ずこの関数を経由すること。素の `db` はテスト・seed・管理処理のみで使う。
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
