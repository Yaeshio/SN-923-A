# SN-923 製造管理システム

SN-923の製造プロセスを管理するためのシステムです。仕様は [specs/](specs/) を参照してください（データモデルは [specs/02_data_model.md](specs/02_data_model.md)）。

## セットアップ手順

### 1. 環境変数の設定
`.env.local` に、ローカルの Supabase（`supabase start`）の接続先を設定します。DB の接続は2つに分かれています。

- `DATABASE_URL`: アプリ用。専用ロール `app_runtime`（RLS をバイパスできない）で接続します。`withUser` を通さないクエリは permission denied になります。
- `DATABASE_ADMIN_URL`: 管理用。`postgres` ロールで接続します。seed（`npm run db:seed`）・drizzle-kit・テストなど、アプリの外のスクリプトだけが使います。

```
DATABASE_URL="postgresql://app_runtime:app_runtime@127.0.0.1:54322/postgres"
DATABASE_ADMIN_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
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
docker exec -i <supabase_dbコンテナ名> psql -U postgres -d postgres -v ON_ERROR_STOP=1 -1 \
  < supabase/migrations/20261105100000_create_app_runtime_role.sql
```

- `20261028100000_create_design_schema.sql`: 設計側（`design` スキーマ）のテーブルとRLS。
- `20261028100100_secure_stl_storage.sql`: `stl-files` バケット（非公開）と、オーナー別フォルダのStorage RLS。
- `20261105100000_create_app_runtime_role.sql`: アプリの接続ロール `app_runtime`（LOGIN / NOSUPERUSER / NOBYPASSRLS / NOINHERIT）。`design` スキーマの権限は持たず、`withUser` が `authenticated` へ切り替えるときだけ権限を使います。**パスワードは含まれません。**
- `20260330132000_*` / `20260331070300_*` は旧構成（`sn923a` スキーマ）のもので、新規の環境には適用不要です。

**`app_runtime` のパスワードを設定します**（migration の後、環境ごとに1回）。ローカルでは上の `.env.local` の例と同じ `app_runtime` にします（`npm run test:integration` も、このパスワードをローカルのスタックへ設定します）。
```bash
docker exec -i <supabase_dbコンテナ名> psql -U postgres -d postgres \
  -c "ALTER ROLE app_runtime PASSWORD 'app_runtime'"
```

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
テストは3つの層に分かれています。ファイル名の接尾辞で見分けます。

| 層 | ファイル | コマンド | 必要なもの |
| :--- | :--- | :--- | :--- |
| ユニット | `*.unit.test.ts` | `npm run test:unit` | なし（DB・Storage は使いません） |
| DB結合（Storage はフェイク） | `*.test.ts` | `npm run test` | Docker |
| Supabase結合（実バケット + 実DB） | `*.integration.test.ts` | `npm run test:integration` | Docker + `npx supabase start` |

### DB結合（`npm run test`）
Docker が必要です。テスト用のPostgreSQL（`supabase-local-vitest` コンテナ、ポート5432）が自動で起動し、`supabase/migrations` を適用します。5432を別のコンテナが使っている場合は停止されます。接続先は `.env.test` の `DATABASE_URL`（アプリ用 `app_runtime`）と `DATABASE_ADMIN_URL`（管理用 `postgres`。テストDBの準備・`TRUNCATE`・ファクトリ・検証用の読み取り）です（どちらもローカルの5432以外を指していると実行を拒否します）。`app_runtime` のパスワードはテスト用の固定値で、`tests/utils/supabaseStub.ts` が設定します。Storage は `tests/utils/storage.ts` のフェイクに差し替えます。

### Supabase結合（`npm run test:integration`）
実STLを実バケット（`stl-files`）へ保存し、DBへ登録するところまでを検証します。事前に `npx supabase start` でローカルのスタックを起動し、`supabase/migrations` を適用しておいてください（スタックの自動起動と `db reset` は行いません）。接続先は `supabase status` から取得し、ローカル以外は実行を拒否します。管理用は `supabase status` の `DB_URL`（`postgres`）、アプリ用はそのユーザーを `app_runtime` に替えたものです。`app_runtime` ロールが無いと（migration 未適用）、案内を出して終了します。

- 開発用のスタック（54321 / 54322）を共有します。DB全体の `TRUNCATE` はせず、テストが作ったユーザー・データ・ファイルだけを削除します（中断した実行の残骸は、次回の開始時に `*@integration.example.com` のユーザーとして掃除されます）。
- 別プロジェクトのスタックが同じポートで動いていると接続できません。先に `supabase stop` してください。

### Zed でのデバッグ
`.zed/debug.json` に、層ごとの「開いているテストファイルをデバッグ」する構成があります。テストファイルを開いてブレークポイントを置き、`debugger: start`（F4）で `Vitest: unit (current file)` などを選びます。TypeScript は `.ts` のまま止まります（別途の設定は不要です）。

- Zed の自動検出タスクは既定の設定（`vitest.config.ts`）で動くため、`*.unit.test.ts` と `*.integration.test.ts` は対象外になります。必ずこの構成を使ってください。
- 対象は「起動時にアクティブなエディタのファイル」（`$ZED_FILE`）です。ファイルの種類に合う構成を選んでください（`*.unit.test.ts` は `Vitest: unit`、`*.integration.test.ts` は `Vitest: Supabase integration`）。合わないと `No test files found` で終了し、停止も Pass も出ません。ターミナルの `filter:` の行が意図したファイルか確認してください。前回の実行を再実行すると、前のファイルのままになることがあります。
- DB結合とSupabase結合の構成は、デバッグ時も上記の前提（Docker / `npx supabase start`）が必要です。
- ブレークポイントが効かないときは、`.zed/debug.json` の `args` に `--pool=forks --poolOptions.forks.singleFork` を足してください。

詳細は [specs/06_test_strategy.md](specs/06_test_strategy.md)。

## CI（GitHub Actions）
PR と `main` への push で、`.github/workflows/ci.yml` が次の3ジョブを並列に実行します。`main` ではいずれかが失敗するとマージできません（branch protection の必須チェック）。

| ジョブ | 内容 | 手元での再現 |
| :--- | :--- | :--- |
| `typecheck` | 型チェック | `npx tsc --noEmit` |
| `lint` | ESLint（`eslint.config.mjs`） | `npm run lint` |
| `build` | 本番ビルド | `npm run build` |

- Node のバージョンは `.nvmrc`（24）で固定しています。
- `build` は `DATABASE_URL` などの環境変数を設定せずに実行します。手元で試すときは、`.env*` を外した状態か、環境変数を未設定にして実行してください。
- DB を使うテストは、まだ CI では実行していません。
- `eslint` は 9 系に固定しています。`eslint-plugin-react` / `import` / `jsx-a11y` が ESLint 10 に未対応のためです。

## 本番の環境変数
デプロイ先には `.env.example` の3つ（`DATABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`）を設定します。**`DATABASE_ADMIN_URL`（`postgres` ロール）はデプロイ先に設定しません。**

- `DATABASE_URL` は Supabase Dashboard の **Connect > Transaction pooler**（ポート6543）の文字列をもとに、ユーザー名を `app_runtime.<project-ref>`（コピーした `postgres.<project-ref>` の `postgres` を `app_runtime` に替える）、パスワードを `app_runtime` のものに替えて使います。ホスト（`aws-0` / `aws-1` など）はプロジェクトごとに異なるため、手で組み立てずコピーしてください。誤ると `Tenant or user not found` で接続に失敗します。
- 6543 は prepared statement が使えないため、`src/shared/db/index.ts` は `prepare: false` で接続します。
- マイグレーションは別経路です。`supabase link` 後に `supabase db push`（Direct / Session接続）で適用します。アプリの `DATABASE_URL` は使いません。
- `app_runtime` のパスワードは migration に含まれません。本番では `ALTER ROLE app_runtime PASSWORD '...'` で設定し、切り替えの手順は [specs/08_deployment_supabase.md](specs/08_deployment_supabase.md) の「6. アプリの接続ロール (app_runtime)」を参照してください。

## アクセス制御（RLS）と DB アクセスの規則
設計データは作成したユーザー（`assemblies.owner_id`）ごとに分離されます。アプリは Drizzle で直結するため、DBアクセスは必ず `src/shared/db/rls.ts` の `withUser(userId, fn)` を経由してください。

アプリの接続ロール `app_runtime` は RLS をバイパスできず、`design` スキーマの権限を直接持ちません。`withUser` を通さない素の `db` のクエリは permission denied になります（規約ではなくDBの権限で強制しています）。RLS を受けない `adminDb`（`src/shared/db/admin.ts`、`postgres` ロール）は、テスト・seed・管理処理でのみ使い、アプリのコード（`src/`）からは import しません（[specs/05_architecture.md](specs/05_architecture.md) 3.4）。

## 利用可能なスクリプト
- `npm run dev`: Next.js の開発サーバーを起動します。
- `npm run build` / `npm run start`: 本番ビルド / 起動。
- `npm run lint`: ESLint を実行します（`next lint` は Next 16 で廃止されたため、`eslint` を直接実行します）。
- `npm run db:generate`: `schema.ts` から migration 用のSQLを生成します（適用はしません）。
- `npm run db:seed`: 開発用ユーザーとサンプルデータを `.env.local` のDBへ投入します（`DATABASE_ADMIN_URL` で接続します）。
- `npm run test`: Vitest でDB結合のテストを実行します（ユニットとSupabase結合は含みません）。
- `npm run test:unit` / `npm run test:integration`: ユニット / Supabase結合のテストを実行します（上記「テスト」を参照）。
- `npm run db:up` / `npm run db:down`: `docker-compose.yml` の素のPostgreSQLを起動/停止します（Supabase を使わない場合の旧構成。`auth` スキーマが無いため、現行のスキーマはそのままでは適用できません）。
