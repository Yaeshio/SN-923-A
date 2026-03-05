# アーキテクチャ設計書 (Draft)

## 1. モジュール分割方針
エージェントによるSDD実装を円滑に進めるため、ドメインに基づいたモジュール分割（Modular Monolith）を採用する。各モジュールは、自身のUI、ロジック、データアクセスをカプセル化する。

### 1.1 ディレクトリ構造
```text
src/
├── modules/
│   ├── design-registry/      # 【設計管理】BOM登録、STL解析、Partマスタ
│   ├── production-control/   # 【製造管理】個体生成、ステータス、履歴
│   └── storage-logistics/    # 【物理管理】Box(保管場所)マスタ、空き状況
├── shared/                   # 【共有】型定義、DBクライアント、共通Utils
└── app/                      # 【UI層】Next.js App Router (Page, Layout)
```

### 1.2 モジュール内部の標準構成
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
- **トランザクション管理**: 複数テーブルに跨る更新のアトミック性を保証。特にBox割り当て時などは `SELECT FOR UPDATE` 等による適切なロックを行い、競合を防止する。
- **バリデーション**: 業務ルールに基づいた遷移可否等の事前チェック。

### 2.2 処理の流れ（例：ステータス更新）
1. `BoardUI` が `StatusAction` を呼び出す。
2. `StatusAction` が `updateStatusPipeline` を呼び出す。
3. `updateStatusPipeline` 内で以下を実行：
    - `PartItemService.validateTransition()`
    - `DB.transaction` を開始
    - `PartItemService.updateStatus()`
    - `HistoryService.record()`
    - `StorageService.releaseBoxIfDone()` (必要に応じて)
    - トランザクション・コミット

## 4. 技術スタック (Confirmed)
エージェントによる実装およびデプロイに使用する技術スタックを以下に定める。

- **Frontend**: Next.js (App Router), Tailwind CSS
- **UI Components**: Shadcn/UI (Radix UI)
- **Database**: Neon (Serverless Postgres)
- **ORM**: Drizzle ORM (Neon との相性が良く、サーバーレス環境で軽量に動作するため)
- **Deployment**: Vercel
- **Storage**: Firebase Storage (STLファイル管理)
- **Validation**: Zod

## 5. 開発・デプロイフロー
- **データベース管理**: Neon Studio を使用し、開発用ブランチと本番用ブランチを分離する。
- **本番反映**: Vercel の Preview Deployment を活用し、性能・動作検証後に本番ブランチへマージする。
- **環境差異**: `.env.local` (開発用) と Vercel Environment Variables (本番用) で接続先を切り替える。
