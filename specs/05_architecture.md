# アーキテクチャ設計書 (Draft)

> **改訂メモ (2026-10-28)**: `02_data_model.md` のドメインモデル再定義に合わせて改訂。モジュールを `design-registry` / `print-production` / `master` に再編し（`production-control` を `print-production` に置換、`storage-logistics` を削除）、Box 排他制御を除いて、Storage と DB の整合性方針（補償処理・転記・スキーマ分離）を追加した。章番号の抜けも是正した。
> 暫定扱いの事項は「(暫定)」と明示し、論点は `02_data_model.md` の「9. 未決事項」に集約している。

## 1. モジュール分割方針
エージェントによるSDD実装を円滑に進めるため、ドメインに基づいたモジュール分割（Modular Monolith）を採用する。各モジュールは、自身のUI、ロジック、データアクセスをカプセル化する。

### 1.1 ディレクトリ構造
```text
src/
├── modules/
│   ├── design-registry/      # 【設計管理】アセンブリ・パーツ・パーツインスタンス、インポート、改訂登録、ダウンロード
│   ├── print-production/     # 【製造管理】プリントデータ、製作モデルリスト、ジョブ、製作品、歩留まり集計
│   └── master/               # 【マスタ】プリンタ・レジン・フィルム、マスタ管理画面
├── shared/                   # 【共有】型定義、DBクライアント、ストレージ、エラー、共通Utils
└── app/                      # 【UI層】Next.js App Router (Page, Layout)
```

旧構成との対応:

| 旧 | 新 |
| :--- | :--- |
| `design-registry` | `design-registry`（所有テーブルが `projects` / `units` / `parts` から `assemblies` / `parts` / `part_instances` に変わる） |
| `production-control` | `print-production`（個体・ステータス・履歴の機能を廃止し、プリントデータ〜歩留まりの機能に置換） |
| `storage-logistics` | 廃止（Box 管理の廃止による） |
| `master` | `master`（現行コードに存在するが旧仕様に記載がなかったため、本書で正式に定義。Box・ユニットのタブを廃止し、レジン・フィルムを追加） |

### 1.2 モジュールの所有テーブルと依存

| モジュール | 所有テーブル | 他モジュールへの依存 |
| :--- | :--- | :--- |
| `design-registry` | `assemblies`, `parts`, `part_instances` | なし |
| `print-production` | `print_data`, `model_list_items`, `print_jobs`, `print_results` | `design-registry`（**プリントデータ登録時のパーツインスタンスの読み取りのみ**）、`master`（ジョブ作成時のプリンタ・レジン・フィルムの参照） |
| `master` | `printers`, `resins`, `films` | なし |

- 設計側（`design-registry`）と製造側（`print-production`）は**転記方式で疎結合**にする。`print-production` は、登録時に `design-registry` の公開された読み取り関数でパーツインスタンスを取得し、`model_list_items` へ写し取る。**登録後は設計側への参照を持たない**（外部キーなし）ため、設計側の修正・削除が過去のプリント記録に影響しない。
- `master` は、アセンブリ・パーツのマスタタブから `design-registry` の Server Actions を呼び出す（画面のみの依存）。

### 1.3 モジュール内部の標準構成
エージェントへの指示を統一するため、以下のサブディレクトリ構成を遵守する。
- `actions/`: UIからのリクエストを受け付ける Server Actions。
- `pipelines/`: 複数のサービスを跨ぐ一連の業務フロー（オーケストレーション）。
- `services/`: 特定のテーブル/エンティティに対するDB操作などのコアドメインロジック。
- `components/`: モジュール固有のReactコンポーネント。
- `types/`: モジュール固有の型定義。

## 2. パイプライン層の導入
ロジック層（Actions）とコアドメイン層（Services）の間に **Pipeline層** を配置する。

### 2.1 役割
- **オーケストレーション**: 複数のService関数の実行順序を制御。
- **トランザクション管理**: 複数テーブルに跨る更新のアトミック性を保証。例: パーツと初期インスタンスの同時登録、プリントデータと製作モデルリストの同時登録。
- **競合の処理**: 一意制約違反の検知と再試行（改訂番号の採番）。旧仕様の Box 割り当て時の `SELECT FOR UPDATE` による排他制御は不要となった。
- **Storage との整合**: ファイル保存とDB登録の順序制御、失敗時の補償処理（3.1）。
- **バリデーション**: 業務ルールに基づいた事前チェック（所属検証、数量の妥当性など）。

### 2.2 処理の流れ（例：プリントデータ登録）
1. `PrintDataUI` が `PrintDataAction` を呼び出す。
2. `PrintDataAction` が `PrintDataRegistrationPipeline` を呼び出す。
3. `PrintDataRegistrationPipeline` 内で以下を実行：
    - 入力の検証と、`design-registry` の読み取り関数によるパーツインスタンスの取得
    - `printDataId` の採番
    - `StorageService.uploadFile()`（エクスポートデータの保存）
    - `DB.transaction` を開始
    - `PrintDataService.create()` と `ModelListService.createFromInstances()`（行IDを新規採番して転記）
    - トランザクション・コミット
    - 失敗時は `StorageService.deleteFile()`（補償処理）

各パイプラインの入出力・ステップは `specs/04_logic_api.md` を参照。

## 3. データ整合性方針

### 3.1 Storage とDBの整合（補償処理）
- ファイルの保存（Storage）とレコードの登録（DB）は、同一トランザクションにできない。そのため **「Storage保存 → DBトランザクション → 失敗時に保存済みファイルを削除」** の順で処理する。
- IDはアプリ側で先に採番し、ファイルパスに含める（`parts/{partId}/...`, `print-data/{printDataId}/...`）。これにより、旧仕様の `PENDING` レコードによるID確保は不要になった。
- 補償削除に失敗して残った孤児ファイルは、DBから参照されておらず作成から一定時間が経過したものを、定期クリーンアップ（Edge Config または Cron）で削除する。
- Storage 上のオブジェクトは不変として扱い、上書きや、参照中のファイルの削除をしない。

### 3.2 転記（スナップショット）
- 製造側が設計側の情報を保持する場合は、外部キーを張らずに値を写し取る（`model_list_items` の `part_instance_id` / `part_id` / `model_name`）。
- 転記テーブルの行は、転記のたびに行ごとの新規UUIDを主キーとして採番する。

### 3.3 スキーマ分離 (暫定。`02_data_model.md` 未決事項 10)
設計側と製造側は外部キーで結ばないため、Postgres のスキーマを分けることができる。**分離する案**を暫定の方針とする。

| スキーマ | テーブル |
| :--- | :--- |
| `design` | `assemblies`, `parts`, `part_instances` |
| `public` | `print_data`, `model_list_items`, `print_jobs`, `print_results`, `printers`, `resins`, `films` |

- 実装は Drizzle の `pgSchema('design')` で定義する。`drizzle.config.ts` には `schemaFilter: ['public', 'design']` を指定する。
- アプリのDBアクセスは Drizzle の直接接続（`DATABASE_URL`）で行い、`supabase-js` は Storage にのみ使う。そのため、Supabase のデータAPI（PostgREST）に対するスキーマ公開設定は不要である。
- テストのクリーンアップ（`TRUNCATE`）は両スキーマのテーブルを対象にする（`06_test_strategy.md`）。
- 分離しない場合も、モジュールの所有テーブルと依存の規則（1.2）は変わらない。

## 4. 技術スタック (Confirmed)
エージェントによる実装およびデプロイに使用する技術スタックを以下に定める。

- **Frontend**: Next.js (App Router), Tailwind CSS
- **UI Components**: Shadcn/UI (Radix UI)
- **Database**: Supabase (PostgreSQL)
- **ORM**: Drizzle ORM (Supabase との相性が良く、軽量に動作するため)
- **Deployment**: Vercel
- **Storage**: Supabase Storage (STLファイル・プリントデータの管理。バケットは現行の `stl-files` を継続)
- **Authentication**: Supabase Auth (ユーザー認証。MVP では未使用で、Phase 2 以降)
- **Validation**: Zod

## 5. 開発・デプロイフロー
- **データベース管理**: Supabase Dashboard / Supabase CLI を使用し、開発用環境（ローカル）と本番用プロジェクトを分離する。
- **本番反映**: Vercel の Preview Deployment を活用し、性能・動作検証後に本番ブランチへマージする。
- **環境差異**: `.env.local` (開発用) と Vercel Environment Variables (本番用) で Supabase の接続先（URL、Anon Key、DB URL）を切り替える。
