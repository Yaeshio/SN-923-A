# Supabase 既存プロジェクトへのデプロイ仕様書 (別スキーマ構成・認証共有)

> **改訂メモ (2026-10-28)**: データモデルの再定義（`02_data_model.md`）に伴い、専用スキーマは `sn923a` から **`design`（設計側）+ `public`（製造・マスタ）** に変更した（`05_architecture.md` 3.3）。設計側3表は `design` に実装済みで、アクセス制御は本書 2.2 の `app_users` 方式ではなく**所有者別 RLS**（`02_data_model.md` 8.1）に改めた。本書の `sn923a` / `app_users` の記述は旧構成のもので、既にデプロイ済みの環境に残る旧スキーマの撤去は別途行う（破壊的なため未実施）。
>
> 現行の migration: `20261028100000_create_design_schema.sql`（design スキーマ・RLS）、`20261028100100_secure_stl_storage.sql`（`stl-files` バケットをオーナー別フォルダの RLS に。プレゼン用の全許可ポリシーを撤回するため、旧バージョンのアプリ（anon での Storage 操作）とは併用できない）。`design` は PostgREST の公開スキーマ（`api.schemas` / Extra exposed schemas）に**追加しない**。
>
> **改訂メモ (2026-11-05)**: アプリの接続を `postgres` から専用ロール `app_runtime`（NOBYPASSRLS）へ切り替えた（`20261105100000_create_app_runtime_role.sql`）。パスワードは migration に含めず環境ごとに設定する。手順は 6 を参照。

## 1. 目的と要件
本ドキュメントは、現在開発中のアプリケーション（SN-923-A）のデータベースおよびバックエンドリソースを、**既に稼働中または作成済みのSupabase本番プロジェクト**へデプロイするための手順と仕様を定義します。

**【主な要件】**
- **スキーマの分離:** 既存プロジェクトの `public` スキーマを汚染しないよう、本アプリ専用のスキーマ（例: `sn923a`）を作成し、すべてのテーブルや関数をそこに配置する。
- **認証基盤の共有:** 既存プロジェクトで設定されているAuth基盤（ユーザー管理、プロバイダー設定等）をそのまま利用し、ユーザー認証を行う。

---

## 1.5 既存プロジェクトから取得・確認が必要な情報
本デプロイフローを実施するにあたり、対象となる既存のSupabaseプロジェクトから以下の情報を事前に取得・確認しておく必要があります。

1. **Project Reference ID（プロジェクトID）**
   - **用途:** ローカル環境（Supabase CLI）および本番プロジェクトを相互に紐付けるために使用します。
   - **確認場所:** Dashboard > Project Settings > General > Reference ID
2. **Database Password（データベースパスワード）**
   - **用途:** `supabase link` および `supabase db push` コマンド実行時の認証に必要です。
   - **確認場所:** プロジェクト作成時に設定したパスワード（紛失時はダッシュボードのDatabase設定からリセット可能）
3. **Project URL & Anon (public) Key**
   - **用途:** 本アプリ側の環境変数 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) に設定し、ブラウザ（クライアント）から該当プロジェクトへ接続するために使用します。
   - **確認場所:** Dashboard > Project Settings > API

これらを準備した上で、後続の運用フローに沿ってデプロイ作業を進めます。

---

## 2. データベースアーキテクチャ方針

### 2.1 専用スキーマの作成
本アプリのデータは、分離された独立スペースで管理するため、専用のスキーマを作成します。
- **スキーマ名（例）:** `sn923a`

### 2.2 アプリ専用ユーザー管理（隔離レイヤー）
既存プロジェクトの `auth.users` にアカウントを持つ全ユーザーが本アプリのデータにアクセスできるリスクを防ぐため、本アプリ専用のユーザー管理テーブルを導入します。

```sql
CREATE TABLE sn923a.app_users (
  id uuid REFERENCES auth.users(id) PRIMARY KEY,
  role text CHECK (role IN ('admin', 'worker')) DEFAULT 'worker',
  created_at timestamptz DEFAULT now()
);
```

### 2.3 マイグレーション・RLS 実装ルール
1. **スキーマおよびテーブル作成:**
   常にスキーマ名を明示して作成し、既存の `public` スキーマと完全に分離します。
   ```sql
   CREATE TABLE sn923a.part_items (
     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
     part_id uuid NOT NULL, -- 実際は 02_data_model.md の定義に従う
     status text NOT NULL,
     updated_at timestamptz DEFAULT now()
   );
   ```

2. **高度な RLS（Row Level Security）ポリシー:**
   `app_users` テーブルを参照することで、共有プロジェクト内での隔離を担保します。

   ```sql
   ALTER TABLE sn923a.part_items ENABLE ROW LEVEL SECURITY;
   
   -- 閲覧権限: 本アプリのユーザーリストに登録されていること
   CREATE POLICY "利用者はアイテムを閲覧可能" 
   ON sn923a.part_items FOR SELECT 
   USING (EXISTS (SELECT 1 FROM sn923a.app_users WHERE id = auth.uid()));

   -- 更新権限: 作業員以上のロールを持つユーザーのみ
   CREATE POLICY "作業員以上はステータスを更新可能" 
   ON sn923a.part_items FOR UPDATE 
   USING (EXISTS (SELECT 1 FROM sn923a.app_users WHERE id = auth.uid() AND role IN ('worker', 'admin')))
   WITH CHECK (EXISTS (SELECT 1 FROM sn923a.app_users WHERE id = auth.uid() AND role IN ('worker', 'admin')));
   ```

---

## 3. アプリケーション（クライアント）側の対応

Supabase JS クライアントを初期化する際、デフォルトの `public` スキーマではなく、先ほど作成したカスタムスキーマを向くように設定します。

```typescript
// src/lib/supabaseClient.ts またはそれに準ずるファイル
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 'db.schema' オプションで専用スキーマを指定
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'sn923a',
  },
  auth: {
    // セッションの永続化など既存の設定を踏襲
    persistSession: true,
  }
})
```
これにより、`supabase.from('part_items')` とクエリを発行した際、自動的に `sn923a.part_items` に対してリクエストが行われます。認証 API (`supabase.auth.*`) は内部的に常に `auth` スキーマ・エンドポイントを参照するため影響を受けません。

---

## 4. 既存プロジェクトへのデプロイ（Push）手順

開発環境から、ターゲットとなる本番プロジェクトへスキーマとテーブルをデプロイするフローです。マイグレーション履歴の競合を防ぐため、注意深く作業します。

### 4.1 プロジェクトのリンク
ローカル環境を、既存のSupabaseプロジェクトとリンクさせます。
```bash
# Supabase CLI へのログイン
npx supabase login

# 既存プロジェクトとの紐付け（Reference IDを指定）
npx supabase link --project-ref <既存のプロジェクトID>
```
※既存プロジェクトのデータベースパスワードが求められます。

### 4.2 リモート状態の取得 (Pull) 【重要】
既存プロジェクトには既に他のマイグレーション履歴が存在する可能性があるため、新規マイグレーションをプッシュする前に必ずリモートの状態を Pull して同期させます。

```bash
# リモートのマイグレーション履歴をローカルへ同期
npx supabase db pull
```

これにより、既存の `public` スキーマなどに関する過去の変更履歴がローカルに反映され、`db push` 時のマイグレーション履歴の競合（Conflict）を回避できます。

### 4.3 マイグレーションの施行 (Push)
ローカルで作成した本アプリ専用のマイグレーションファイルをリモートへ適用します。

```bash
npx supabase db push
```

**【注意事項】**
`supabase db push` は、リモートとローカルのマイグレーション履歴を比較して差分を適用します。既存プロジェクトで管理されているテーブルに対して安易に `DROP` や `ALTER` を行わないよう、マイグレーションファイルの内容を厳重に管理してください（本仕様に基づき、原則として `sn923a` スキーマ配下のオブジェクトのみを操作対象とします）。

---

## 5. PostgreSQLの権限とAPI公開設定

Supabase（PostgREST）でカスタムスキーマをAPIとして公開するには、設定（Dashboard）側の修正、または SQLでの権限付与が必要です。

### 5.1 スキーマのAPI公開（PostgREST設定）
デフォルトでは `public` スキーマのみが API経由でアクセス可能です。`sn923a` もアクセスできるように設定を追加します。

**【ダッシュボードからの設定】**
1. Settings > API > Extra exposed schemas に移動。
2. `sn923a` を追加して保存。

**【SQLマイグレーションでの設定】**
ダッシュボード操作を自動化するため、最初のマイグレーションファイルの末尾に以下の権限付与 SQL を含めることが推奨されます。
※APIロール (`anon`, `authenticated`) に対して利用権限(USAGE)を与える必要があります。

```sql
-- APIアクセス用のロール群にスキーマの利用を許可
GRANT USAGE ON SCHEMA sn923a TO anon, authenticated, service_role;

-- スキーマ内のすべてのテーブル・関数・シーケンスへのアクセス権限を付与
GRANT ALL ON ALL TABLES IN SCHEMA sn923a TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA sn923a TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA sn923a TO anon, authenticated, service_role;

-- 今後作成されるテーブル等にも自動的に権限を付与するように設定変更（重要）
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA sn923a GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA sn923a GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA sn923a GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
```

---

## 6. アプリの接続ロール (app_runtime)

> 本節は現行構成（`design` スキーマ + 所有者別 RLS）の手順である。2〜5 の `sn923a` / `app_users` の記述は旧構成のもの。

### 6.1 目的
アプリは Drizzle で DB に直結する。接続ロールがテーブル所有者の `postgres`（`BYPASSRLS`）だと、`withUser` を使い忘れても RLS が黙ってバイパスされる。アプリの接続ロール自体を RLS をバイパスできない `app_runtime` にして、DB 側で強制する（`05_architecture.md` 3.4）。

| ロール | 用途 | 接続先の環境変数 |
| :--- | :--- | :--- |
| `app_runtime` | アプリの実行（Next.js）。`design` スキーマの権限を直接持たず、`withUser` が `authenticated` へ切り替えるときだけ権限を使う | `DATABASE_URL` |
| `postgres` | migration・seed・テスト・drizzle-kit | `DATABASE_ADMIN_URL`（**アプリの実行環境には設定しない**） |

### 6.2 ロールの作成とパスワード
- ロールは `supabase/migrations/20261105100000_create_app_runtime_role.sql` が作る（`LOGIN` / `NOSUPERUSER` / `NOBYPASSRLS` / `NOINHERIT`。`GRANT authenticated TO app_runtime`）。他の migration と同じく `supabase db push` で適用する。冪等なので再適用できる。
- **パスワードは migration に書かない**（リポジトリに残さない）。適用後に環境ごとに設定する。
  ```sql
  ALTER ROLE app_runtime PASSWORD '<強いパスワード>';
  ```
  SQL Editor か `psql` で、`postgres` ロールとして実行する。パスワードに記号を含める場合は、接続文字列で URL エンコードする。
- ロールはクラスタ共通である。共有プロジェクトで `app_runtime` の名前が他のアプリと衝突しないか、作成前に `select rolname from pg_roles where rolname = 'app_runtime'` で確認する。

### 6.3 接続文字列（Supavisor の Transaction pooler）
- ユーザー名は `app_runtime.<project-ref>`（Dashboard > Connect > Transaction pooler の `postgres.<project-ref>` の `postgres` を `app_runtime` に替える）。ホストとポート（6543）はコピーしたものをそのまま使う。
- `withUser` は `set_config(..., true)` と `SET LOCAL ROLE` をトランザクション内で実行する。Transaction mode では、トランザクションの間は同じバックエンド接続に固定される仕様で、`LOCAL` なのでトランザクションの外へは漏れない（コネクションへ残らないことは `tests/db/rls.test.ts` で確認済み）。ローカルの pooler は無効（`config.toml` の `[db.pooler]`）で、pooler 経由で `app_runtime` が動くことは**本番の手順 6.4 の 4 で確認する**。

### 6.4 本番の切り替え手順（無停止）
コードは後方互換である（アプリは `DATABASE_URL` だけを読む）。次の順で行い、各ステップの前に確認する。
1. コードをデプロイする（この時点では `DATABASE_URL` は `postgres` のままで、挙動は変わらない）。
2. `supabase db push` で migration を適用する（ロールが作られる。まだ誰も使わない）。
3. `ALTER ROLE app_runtime PASSWORD '...'` を設定する。
4. pooler（6543）の `app_runtime.<project-ref>` で接続できること、`withUser` 相当のトランザクション（`set_config` → `SET LOCAL ROLE authenticated` → 自分の行だけが見える）が動くこと、`withUser` なしでは `permission denied` になることを確認する。
5. デプロイ先の `DATABASE_URL` を `app_runtime` のものに替えて再デプロイし、動作確認する（ログイン → アセンブリ → インポート → ダウンロード）。
6. 問題があれば `DATABASE_URL` を元の接続文字列に戻して再デプロイする（ロールは残してよい）。

### 6.5 実環境での権限の確認
ローカルの Supabase（`supabase start`、PG17）で確認した事実。テストは `tests/db/appRuntime.integration.test.ts`。
- `postgres` ロールは `authenticated` の `ADMIN OPTION` と `CREATEROLE` を持つため、migration の `CREATE ROLE` と `GRANT authenticated TO app_runtime WITH INHERIT FALSE, SET TRUE` が通る。
- `app_runtime` が直接読み書きできるテーブルは、`design` / `auth` / `storage` / `public` / `sn923a` のどれにも無い。`public` には `CREATE` もできない。`authenticated` には `design`・`public`・`storage` などの権限があるため、`app_runtime` が `withUser` の外では何も届かないことが、この差で分かる。
- **`net` スキーマ（pg_net 拡張）は例外**: Supabase が `PUBLIC` へ既定で付与している（`USAGE`、`net._http_response` / `net.http_request_queue` の全権限、`http_delete` などの EXECUTE）。`supabase_admin` 所有で `postgres` では変更できず、`anon` を含む全ロールに共通する。`http_get` / `http_post` の EXECUTE は `PUBLIC` に付いていない。アプリのデータとは無関係なので、対処しない。
- 本番でも、手順 6.4 の 4 で次のクエリを `postgres` で実行し、`app_runtime` が直接届くテーブルに上記以外が無いことを確認する。共有プロジェクトでは、他のアプリのテーブルや Supabase の既定の付与が、ローカルと異なる可能性がある。
  ```sql
  select c.relnamespace::regnamespace as schema, c.relname
  from pg_class c
  where c.relkind in ('r', 'v', 'm', 'p', 'f')
    and c.relnamespace::regnamespace::text not in ('pg_catalog', 'information_schema')
    and has_table_privilege('app_runtime', c.oid, 'SELECT, INSERT, UPDATE, DELETE')
  order by 1, 2;
  ```

## 7. まとめ（プレゼン・アピールポイント）
本構成を採用することで、MVP デモおよび本番運用において以下の強力なメリットをアピールできます。

1. **ゼロ・コンタミネーション（非干渉）:** 
   既存プロジェクトの `public` スキーマを一切変更せず、完全に独立した環境 (`sn923a`) で動作するため、既存資産への悪影響がゼロであることを保証。
2. **多重防御による隔離:** 
   `auth.users` が共有であっても、専用の `app_users` フィルタリングにより、部外者（他のアプリのユーザー）からのアクセスを完全に遮断。
3. **実務レベルの権限統制:** 
   単なる「所有者チェック」ではなく、「作業員ロール」などの業務実務に即したステータス変更権限を RLS で実演可能。
4. **開発効率の維持:** 
   クライアント初期化時に `schema` オプションを指定するだけで、開発者は通常の Supabase 開発と同等の手軽さで高度なマルチテナント構成を扱える。
