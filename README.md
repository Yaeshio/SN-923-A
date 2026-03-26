# SN-923 製造管理システム

SN-923の製造プロセスを管理するためのシステムです。

## セットアップ手順

### 1. 環境変数の設定
`.env.example` を `.env.local` にコピーし、必要な設定を行ってください。
```bash
cp .env.example .env.local
```
ローカル開発用のデフォルト `DATABASE_URL` は以下の通りです：
`postgresql://postgres:postgres@localhost:5432/local_db_name?sslmode=disable`

### 2. データベースの起動と構築
Docker Compose を使用して、ローカルの PostgreSQL データベースを起動します：
```bash
npm run db:up
```

データベースのスキーマを同期します（テーブル作成）：
```bash
npm run db:push
```

（任意）動作確認用の初期データを投入します：
```bash
npm run db:seed
```

### 3. 開発サーバーの起動
```bash
npm run dev
```
ブラウザで [http://localhost:3000](http://localhost:3000) を開き、動作を確認してください。

## 利用可能なスクリプト
- `npm run dev`: Next.js の開発サーバーを起動します。
- `npm run db:up`: ローカルDBコンテナを起動します。
- `npm run db:down`: ローカルDBコンテナを停止します。
- `npm run db:push`: Drizzle を使用してスキーマ変更をDBに反映します。
- `npm run db:seed`: 動作確認用のシードデータを投入します。
- `npm run test`: Vitest を使用してテストを実行します。
