# Supabase 既存プロジェクトへのデプロイ仕様書 (別スキーマ構成・認証共有)

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

## 6. まとめ（プレゼン・アピールポイント）
本構成を採用することで、MVP デモおよび本番運用において以下の強力なメリットをアピールできます。

1. **ゼロ・コンタミネーション（非干渉）:** 
   既存プロジェクトの `public` スキーマを一切変更せず、完全に独立した環境 (`sn923a`) で動作するため、既存資産への悪影響がゼロであることを保証。
2. **多重防御による隔離:** 
   `auth.users` が共有であっても、専用の `app_users` フィルタリングにより、部外者（他のアプリのユーザー）からのアクセスを完全に遮断。
3. **実務レベルの権限統制:** 
   単なる「所有者チェック」ではなく、「作業員ロール」などの業務実務に即したステータス変更権限を RLS で実演可能。
4. **開発効率の維持:** 
   クライアント初期化時に `schema` オプションを指定するだけで、開発者は通常の Supabase 開発と同等の手軽さで高度なマルチテナント構成を扱える。
