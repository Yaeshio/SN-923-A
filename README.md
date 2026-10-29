# SN-923 製造管理システム

SN-923の製造プロセスを管理するためのシステムです。仕様は [specs/](specs/) を参照してください（データモデルは [specs/02_data_model.md](specs/02_data_model.md)）。

## セットアップ手順

### 1. 環境変数の設定
`.env.local` に、ローカルの Supabase（`supabase start`）の接続先を設定します。

```
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<supabase status で表示される anon key>"
```

### 2. データベースの構築
スキーマは [supabase/migrations/](supabase/migrations/) の SQL が正です。**`drizzle-kit push` は使わないでください**（RLS ポリシーの `USING` / `WITH CHECK` を落として作成します）。

Supabase CLI を使う場合:
```bash
supabase db push
```

CLI を使わず、動いている Supabase のDBコンテナへ直接適用する場合（コンテナ名は `docker ps` で確認）:
```bash
docker exec -i <supabase_dbコンテナ名> psql -U postgres -d postgres -v ON_ERROR_STOP=1 -1 \
  < supabase/migrations/20261028100000_create_design_schema.sql
docker exec -i <supabase_dbコンテナ名> psql -U postgres -d postgres -v ON_ERROR_STOP=1 -1 \
  < supabase/migrations/20261028100100_secure_stl_storage.sql
```

- `20261028100000_create_design_schema.sql`: 設計側（`design` スキーマ）のテーブルとRLS。
- `20261028100100_secure_stl_storage.sql`: `stl-files` バケット（非公開）と、オーナー別フォルダのStorage RLS。
- `20260330132000_*` / `20260331070300_*` は旧構成（`sn923a` スキーマ）のもので、新規の環境には適用不要です。

`src/shared/db/schema.ts` を変更したら、`npm run db:generate` でSQLを生成して内容を確認し、整形して新しい migration として取り込みます（生成物は `drizzle/` に出力されます）。

### 3. 開発用データの投入（任意）
開発用ユーザーとサンプルの設計データを投入します。
```bash
npm run db:seed
```
ユーザー `dev@example.com`（パスワード `password123`。`SEED_USER_EMAIL` / `SEED_USER_PASSWORD` で変更可）でログインできます。ローカルのSupabaseのデモ用サービスロールキーを既定で使うため、ローカル以外には使わないでください。

### 4. 開発サーバーの起動
```bash
npm run dev
```
ブラウザで [http://localhost:3000](http://localhost:3000) を開き、ログイン後に「アセンブリ」から操作します（アセンブリ作成 → STLインポート → パーツ一覧とダウンロード）。

## テスト
```bash
npm run test
```
Docker が必要です。テスト用のPostgreSQL（`supabase-local-vitest` コンテナ、ポート5432）が自動で起動し、`supabase/migrations` を適用します。5432を別のコンテナが使っている場合は停止されます。接続先は `.env.test` の `DATABASE_URL` です（ローカルの5432以外を指していると実行を拒否します）。詳細は [specs/06_test_strategy.md](specs/06_test_strategy.md)。

## アクセス制御（RLS）と DB アクセスの規則
設計データは作成したユーザー（`assemblies.owner_id`）ごとに分離されます。アプリは Drizzle で直結するため、DBアクセスは必ず `src/shared/db/rls.ts` の `withUser(userId, fn)` を経由してください。素の `db` は RLS を受けないため、テスト・seed・管理処理でのみ使います（[specs/05_architecture.md](specs/05_architecture.md) 3.4）。

## 利用可能なスクリプト
- `npm run dev`: Next.js の開発サーバーを起動します。
- `npm run build` / `npm run start`: 本番ビルド / 起動。
- `npm run db:generate`: `schema.ts` から migration 用のSQLを生成します（適用はしません）。
- `npm run db:seed`: 開発用ユーザーとサンプルデータを `.env.local` のDBへ投入します。
- `npm run test`: Vitest を使用してテストを実行します。
- `npm run db:up` / `npm run db:down`: `docker-compose.yml` の素のPostgreSQLを起動/停止します（Supabase を使わない場合の旧構成。`auth` スキーマが無いため、現行のスキーマはそのままでは適用できません）。
