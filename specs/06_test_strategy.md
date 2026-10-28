# テスト戦略・基盤構築計画 (Testing Strategy & Infrastructure Plan)

> **改訂メモ (2026-10-28)**: `02_data_model.md` のドメインモデル再定義に合わせて改訂。テスト対象を新しいパイプライン（インポート、改訂登録、プリントデータ登録、ジョブ作成、結果記録、歩留まり集計、ダウンロード、プリンタ状態）に差し替え、Box／個体／ステータス遷移を前提としたテストとファクトリを廃止対象とした。実DBを使う方針とテスト基盤の構成は変更しない。
> 暫定扱いの事項は「(暫定)」と明示し、論点は `02_data_model.md` の「9. 未決事項」に集約している。

## 1. 背景と目的
現状のテストコードはモックオブジェクトに強く依存しており、特にデータベース操作（トランザクション、外部キー制約、ユニーク制約など）の検証が行われていないため、コードの品質や整合性を担保できない状態にあった。
この問題を解決するため、モックDBを廃止し、Supabase Local（または標準PostgreSQLコンテナ）を用いたローカル環境を前提としたテスト基盤を構築した（`tests/setup.ts` 等）。これにより、TDD（テスト駆動開発）を安全かつ効果的に進める。
本書は、新しいドメインモデルに合わせた**テスト対象の差し替え**と、**新モデルならではの検証観点**（転記、補償処理、一意制約による競合）を定義する。

## 2. テスト基盤のアーキテクチャ設計

### 2.1 環境構築
- **Supabase Localの利用:** ローカル開発環境およびテスト環境におけるデータベースとしてSupabase Local（PostgreSQL）を活用、あるいは同等のPostgreSQLコンテナを稼働させる（現行は `postgres:16-alpine` のコンテナ `supabase-local-vitest` を自動起動）。
- **テスト用データベース:** 開発用DBとは別に、テスト専用のスキーマまたはデータベースを用意し、テスト実行時に自動でマイグレーションを適用する（現行は `drizzle-kit push --force`）。
- **スキーマ分離への対応 (暫定):** `05_architecture.md` の3.3でスキーマを分離する場合は、`drizzle.config.ts` の `schemaFilter` に `design` を含め、マイグレーションが両スキーマのテーブルを作成するようにする。
- **環境変数設定:** `.env.test` ファイルを用意し、Vitest実行時にはテスト用DBの接続文字列を読み込むように設定する。

### 2.2 テストライフサイクル管理 (Vitest Setup)
- **Global Setup/Teardown (`tests/setup.ts`):**
  - **開始時:** テスト用DBへの接続確立、最新スキーマの適用（マイグレーション実行）。
  - **終了時:** DB接続のクローズ、必要に応じたリソースの解放。
- **Test Hook (`beforeEach`, `afterEach`):**
  - 各テストケース実行前に、対象テーブルのデータを全削除（`TRUNCATE`）し、クリーンな状態を保証する（`tests/utils/db.ts` の `clearDb`）。
  - 削除対象は、新モデルの全テーブル（`assemblies`, `parts`, `part_instances`, `print_data`, `model_list_items`, `print_jobs`, `print_results`, `printers`, `resins`, `films`）とする。スキーマを分離する場合は、`design` スキーマのテーブルをスキーマ修飾して含める。
  - これにより、他のテストケースの副作用を受けずに独立したテストが実行可能になる。

### 2.3 テストユーティリティ群の実装
- **DB Connection Manager:** テストコードから安全にトランザクションを開始・終了できるラッパー。
- **Data Factories / Fixtures:**
  - テストに必要な前提データを簡潔に生成・INSERTするファクトリ関数群。
  - 新モデルのファクトリ（`tests/factories/index.ts`）:

| ファクトリ | 内容 |
| :--- | :--- |
| `createTestAssembly` | アセンブリを作成（旧 `createTestProject` / `createTestUnit` を置換） |
| `createTestPart` | パーツを作成し、**同一トランザクションで改訂 1 のインスタンスも作成**する（不変条件を満たしたデータを返す）。`{ part, instance }` を返す |
| `createTestPartInstance` | 指定パーツに新しい改訂を追加する（改訂番号は最大値 + 1） |
| `createTestPrintData` | プリントデータと製作モデルリスト（指定した複数インスタンスの転記）を作成する。`{ printData, items }` を返す |
| `createTestPrinter` / `createTestResin` / `createTestFilm` | マスタを作成（`createTestPrinter` は旧 `createTestMachine` を置換） |
| `createTestPrintJob` | プリントデータ（未指定なら自動作成）とマスタを紐付けてジョブを作成する |
| `createTestPrintResult` | 指定ジョブ・製作モデルリスト行の結果を作成する |

  - 廃止するファクトリ: `createTestBox`, `createTestPartItem`, `createTestStatusHistory`。
- **Assertion Helpers:** DBの状態を簡単に検証するためのヘルパー関数。
- **ストレージのスタブ:** `StorageService` はインターフェース境界でスタブ化する。補償処理の検証のため、**呼び出し履歴の記録**（保存・削除されたパス）と、**失敗の注入**（特定の呼び出しで例外を投げる）ができるフェイクを用意する。

## 3. パイプラインテストの計画
実DBを用いた統合的なテストで検証する。
*※ 外部ストレージ（S3等）へのアクセスなど、純粋に外部依存となる部分については、引き続きインターフェース境界でのモック・スタブ化を許容するが、DB層はすべて実DBとする。*

### 3.1 `ImportPipeline` のテスト
- **準備:** ファクトリで事前にアセンブリを投入する。
- **実行:** 複数ファイルを指定してパイプラインを実行。
- **検証:**
  - ファイルごとに `parts` が登録され、`model_name` がファイル名（拡張子を除く）、`model_url` が相対パスになっていること。
  - **各パーツに改訂 1 の初期インスタンスが同時に作られ**、`instance_name` が `model_name` と同じ、`instance_url` が `model_url` と同じ、`change_note` が NULL であること。
  - `parts_quantity` が指定値（未指定なら 1）であること。
  - 存在しない `assemblyId`、`partsQuantity` が 0 以下の場合に、DBに何も作られず例外がスローされること。
  - **補償処理**: DB登録で失敗させた場合に、保存済みファイルが削除されていること（スタブの呼び出し履歴で確認）。Storage保存で途中失敗した場合に、DBにレコードが作られず、保存済みの分が削除されていること。
  - 複数ファイルの登録が all-or-nothing であること（1件の失敗で全件が登録されない）。

### 3.2 `PartInstanceRegistrationPipeline` のテスト
- **準備:** `createTestPart` で改訂 1 を持つパーツを投入する。
- **検証:**
  - 実行のたびに改訂番号が 2, 3, ... と連番で増え、`instance_name` が親パーツ名のコピーになっていること。
  - 修正前の改訂のレコードとファイルパスが変化していないこと（追記専用）。
  - **競合**: 同じパーツへ並行して登録しても、改訂番号が重複せず（`UNIQUE(part_id, revision)`）、再試行により全件が成功すること。再試行の上限を超えた場合に `ConflictError` になること。
  - 存在しない `partId` の場合に `NotFoundError` になること。
  - DB登録に失敗した場合に、保存済みファイルが削除されていること。

### 3.3 `PrintDataRegistrationPipeline` のテスト
- **準備:** 複数のパーツ・改訂（同一パーツの別改訂を含む）を投入する。
- **検証:**
  - `print_data` と、指定した数の `model_list_items` が登録されること。
  - **転記**: 各行の `part_instance_id`、`part_id`（インスタンスの親パーツ）、`model_name`（`instance_name`）、`quantity` が正しく写されていること。
  - **行IDの一意性**: 各行のIDが新規採番であり、同じインスタンスを別のプリントデータに転記しても行IDが重複しないこと。
  - **FKなしの確認**: 転記後に元のパーツ／インスタンスを削除しても、`model_list_items` が読めること（`model_name` がそのまま残っていること）。
  - 同一パーツの別改訂を同じプリントデータに含められること。同一インスタンスの重複指定、数量が 0 以下、`items` が空、ファイルなしの場合に、DBに何も作られず例外がスローされること。
  - **補償処理**: DB登録に失敗した場合に、保存済みのエクスポートデータが削除されていること。トランザクションがロールバックされ、`print_data` だけが残る状態にならないこと。

### 3.4 `PrintJobCreationPipeline` のテスト
- **準備:** プリントデータ、プリンタ（`READY`／`RUNNING`／`MAINTENANCE`）、レジン、フィルムを投入する。
- **検証:**
  - ジョブが登録され、`print_data_id`・`printer_id`・`resin_id`・`film_id`・`job_number` が正しいこと。
  - 同じプリントデータから、プリンタ等を変えて複数のジョブを作成できること。
  - **プリントデータが存在しない場合**（エクスポート済みデータがない場合）にジョブを作成できず、`NotFoundError` になること。
  - `MAINTENANCE` のプリンタで `ValidationError` になること。`RUNNING` のプリンタでは作成でき、警告が返ること (暫定)。
  - ジョブ番号の重複で `ConflictError` になること。
  - プリンタの状態が自動では変化しないこと。

### 3.5 `JobResultRecordingPipeline` のテスト
- **準備:** `createTestPrintData`（複数行）と、そのジョブを投入する。
- **検証:**
  - 行ごとの成功数・失敗数が `print_results` に保存されること。
  - **所属検証**: 別のプリントデータの `model_list_item_id` を指定した場合に `ValidationError` になり、何も保存されないこと。
  - 負数・小数を拒否すること。
  - 成功数＋失敗数が製作数量を超えた場合に警告が返り、保存はされること (暫定)。
  - 同じジョブへ再実行すると上書きされ、`(print_job_id, model_list_item_id)` のレコードが1件のままであること。
  - 一部の行だけを記録しても保存できること。

### 3.6 歩留まり集計 (`YieldQuery`) のテスト
- **準備:** 複数のジョブ・行・結果（一部のジョブは結果未記録）を投入する。
- **検証:**
  - `job` 別の歩留まりが、`Σ success_count / Σ quantity`（ジョブの全行を分母。未記録の行を含む）になること。
  - `part` 別・`revision` 別・`printData` 別・`period` 別が、結果が登録されたジョブのみを対象に集計されること。未記録のジョブは除外され、その件数が返ること (暫定)。
  - **改訂別の比較**: 同一パーツの改訂 1 と改訂 2 で、別々の歩留まりが算出されること。
  - 分母が 0（未記録）のグループは `null` を返し、0% と区別されること。
  - 絞り込み条件（アセンブリ、パーツ、期間）が反映されること。

### 3.7 `DownloadPipeline` のテスト
- **検証:**
  - `kind: 'partInstance'` / `'printData'` で、対応するレコードの相対パスから署名付きURLが取得されること（Storage はスタブ）。
  - `kind: 'part'` が**最新改訂**のインスタンスに解決されること（改訂 1 と 2 がある場合に 2 を返す）。
  - 存在しない対象で `NotFoundError` になること。

### 3.8 `PrinterStatusPipeline` のテスト
- 任意の状態から任意の状態へ変更でき、存在しないプリンタでは `NotFoundError` になること（遷移の制限なし）。

### 3.9 外部キー・制約のテスト
- `02_data_model.md` §8 の制約が実DBで効いていること。
  - `UNIQUE`: `job_number`、`(part_id, revision)`、`(print_data_id, part_instance_id)`、`(print_job_id, model_list_item_id)`。
  - `CHECK`: `parts_quantity > 0`、`revision >= 1`、`quantity > 0`、`success_count >= 0`、`failure_count >= 0`。
  - 削除時動作: 設計側（アセンブリ → パーツ → インスタンス）は `CASCADE`、ジョブが参照するプリンタ・レジン・フィルムとプリントデータは `RESTRICT` で削除できないこと (暫定。`02_data_model.md` 未決事項 18)。

## 4. 既存テスト・基盤の移行計画
テスト基盤（`tests/setup.ts`, `tests/utils/db.ts`, `tests/factories/index.ts`）は構築済みである。新しいドメインモデルに合わせて、以下のとおり移行する。

| 対象 | 対応 |
| :--- | :--- |
| `tests/modules/design-registry/pipelines/ImportPipeline.test.ts` | 3.1 に書き換える |
| `tests/modules/design-registry/pipelines/DownloadPipeline.test.ts` | 3.7 に書き換える |
| `tests/modules/master/pipelines/StatusPipelines.test.ts` | Box の分を削除し、3.8（プリンタ状態）のみ残す |
| `tests/modules/production-control/pipelines/OrderPipeline.test.ts` | 削除（パイプラインの廃止） |
| `tests/modules/production-control/pipelines/StatusUpdatePipeline.test.ts` | 削除（パイプラインの廃止） |
| （新規）`tests/modules/design-registry/pipelines/PartInstanceRegistrationPipeline.test.ts` | 3.2 |
| （新規）`tests/modules/print-production/pipelines/PrintDataRegistrationPipeline.test.ts` ほか | 3.3〜3.6 |
| （新規）制約・削除時動作のテスト | 3.9 |
| `tests/factories/index.ts` | 2.3 のとおり差し替える |
| `tests/utils/db.ts`（`clearDb`） | `TRUNCATE` の対象テーブルを新モデルの全テーブルに差し替える |

## 5. 今後のステップ（フェーズ分割）
1. **基盤の移行フェーズ:** 新スキーマの適用（スキーマ分離する場合は `drizzle.config.ts` の `schemaFilter` を含む）、`clearDb` と `StorageService` スタブ（呼び出し履歴・失敗注入）の更新。
2. **ファクトリ作成フェーズ:** 2.3 のファクトリ群を実装する。`createTestPart` が改訂 1 を同時に作ることを最初に確認する。
3. **テスト実装フェーズ (TDD):** 各パイプラインのテストケースを新基盤上で記述し、テストを失敗させる（Red）状態を確認する。その後、実DBのトランザクションを用いた本番コードの実装（Green）、リファクタリングへと進む。着手順は、`ImportPipeline` → `PartInstanceRegistrationPipeline` → `PrintDataRegistrationPipeline` → `PrintJobCreationPipeline` → `JobResultRecordingPipeline` → `YieldQuery` とする（データの依存順）。
