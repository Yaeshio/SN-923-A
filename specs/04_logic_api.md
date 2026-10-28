# ロジック・API仕様書 (Draft)

> **改訂メモ (2026-10-28)**: `02_data_model.md` のドメインモデル再定義に合わせて全面改訂。旧 `OrderPipeline` / `StatusUpdatePipeline` と Box 排他制御を廃止し、パーツインスタンス・プリントデータ・ジョブ・結果記録のパイプラインを新設した。
> 暫定扱いの事項は「(暫定)」と明示し、論点は `02_data_model.md` の「9. 未決事項」に集約している。

## 1. 業務パイプライン (Pipelines)
各ロジックは `specs/05_architecture.md` で定義されたパイプライン層として実装され、複数のサービスをオーケストレートする。

### 1.0 一覧

| パイプライン | 利用画面 (`03_ui_ux.md`) | モジュール |
| :--- | :--- | :--- |
| `ImportPipeline` | `ImportUI` | `design-registry` |
| `PartInstanceRegistrationPipeline` | `AssemblyDetailUI`（改訂登録ダイアログ） | `design-registry` |
| `PrintDataRegistrationPipeline` | `PrintDataUI` | `print-production` |
| `PrintJobCreationPipeline` | `JobUI` | `print-production` |
| `JobResultRecordingPipeline` | `JobUI`（結果記録） | `print-production` |
| 歩留まり集計 (`YieldQuery`) | `YieldUI`、`JobUI` | `print-production` |
| `DownloadPipeline` | `AssemblyDetailUI`、`JobUI`、`PrintDataUI` | `design-registry` |
| `PrinterStatusPipeline` | `MasterUI`（プリンタタブ） | `master` |
| マスタ系のCRUD（1.9。パイプラインなし） | `AssemblyListUI`、`MasterUI` | `design-registry`、`master` |

### 1.1 パーツインポートパイプライン (`ImportPipeline`)
- **入力**: `files: File[]`, `assemblyId: string`, `partsQuantity?: number`（既定 1。登録後にマスタ画面で編集可）
- **実装方針**:
    - 開発コスト削減およびデータ不整合防止のため、すべてのステップを **同期処理（直列実行）** で行う。ユーザーはアップロードから登録完了まで画面上で待機し、バックグラウンド処理への移行は行わない。
    - 複数ファイルの一括登録は **all-or-nothing** とする。1件でも失敗した場合、DBには何も作られず、保存済みのファイルも削除する。
    - 旧仕様の `PENDING` / `ACTIVE` による二段階登録は廃止した（`02_data_model.md` 未決事項 9）。代わりに「Storage 保存 → DB トランザクション → 失敗時の補償削除」で不整合を防ぐ。
- **ステップ**:
    1. **入力検証**: `assemblyId` のアセンブリが存在すること、ファイルが1件以上あること、`partsQuantity` が 1 以上の整数であること。
    2. **ID採番**: ファイルごとに `partId` と初期インスタンスの `instanceId` をアプリ側で採番する。モデル名はファイル名から拡張子を除いたものとする。
    3. **ストレージ保存**: ファイルを `parts/{partId}/{ファイル名}` へアップロードし、相対パスを得る。
    4. **DB登録（単一トランザクション）**:
        - `parts` を登録（`model_name`, `model_url` = 相対パス, `parts_quantity`）。
        - 初期インスタンスを `part_instances` に登録（`revision` = 1, `instance_name` = `model_name`, `instance_url` = `model_url` と同じパス, `change_note` = NULL）。**パーツと初期インスタンスは必ず同一トランザクションで作る**（各パーツが改訂 1 を持つ不変条件の保証）。
    5. **補償処理**: ステップ3〜4で失敗した場合、保存済みファイルをすべて削除する。削除に失敗したファイルは孤児ファイルとして残り、「2.3 異常系の挙動」のクリーンアップで回収する。
- **出力**: 作成された `Part[]` と、それぞれの初期インスタンス。

### 1.2 改訂登録パイプライン (`PartInstanceRegistrationPipeline`)
設計の修正変更を、パーツインスタンスの新しい改訂として追記する。
- **入力**: `partId: string`, `file: File`, `changeNote?: string`
- **ステップ**:
    1. **事前チェック**: パーツの存在確認、ファイルの存在確認。`changeNote` は改訂 2 以降で入力を促すが、必須とはしない (暫定)。
    2. **ID採番**: `instanceId` をアプリ側で採番する。
    3. **ストレージ保存**: `parts/{partId}/instances/{instanceId}/{ファイル名}` へアップロードし、相対パスを得る。**既存のファイルは上書きしない**。
    4. **DB登録（トランザクション）**: そのパーツの `revision` の最大値 + 1 を新しい改訂番号として `part_instances` に登録する（`instance_name` は `parts.model_name` をコピー）。`UNIQUE(part_id, revision)` 違反（同時登録）の場合は改訂番号を採番し直して再試行する（最大3回。超過時は `ConflictError`）。
    5. **補償処理**: DB登録に失敗した場合、ステップ3で保存したファイルを削除する。
- **出力**: 作成された `PartInstance`。
- **更新・削除**: `instance_url` / `revision` / `change_note` は作成後に変更しない。`instance_name` のみ編集できる。削除は、製作モデルリストへ転記されていないインスタンスに限る（運用ルール。`02_data_model.md` 未決事項 17）。

### 1.3 プリントデータ登録パイプライン (`PrintDataRegistrationPipeline`)
スライサーでエクスポートしたデータをアップロードし、含まれるモデルを製作モデルリストへ転記して登録する。
- **入力**: `name: string`, `items: { partInstanceId: string; quantity: number }[]`, `consumedResin: number`, `file: File`
- **ステップ**:
    1. **事前チェック**:
        - `items` が1件以上あり、`partInstanceId` に重複がないこと（`UNIQUE(print_data_id, part_instance_id)` に対応。同一インスタンスは数量でまとめる）。
        - 各 `quantity` が 1 以上の整数、`consumedResin` が 0 以上の数値であること。
        - 各 `partInstanceId` のパーツインスタンスが存在すること（なければ `NotFoundError`）。
        - `file` が存在すること。**エクスポート済みデータがなければプリントデータは登録できない**（`print_data_url` は NOT NULL）。
    2. **ID採番**: `printDataId` をアプリ側で採番する。
    3. **ストレージ保存**: `print-data/{printDataId}/{ファイル名}` へアップロードし、相対パスを得る。
    4. **DB登録（単一トランザクション）**:
        - `print_data` を登録（`name`, `print_data_url`, `consumed_resin`）。
        - 指定された `items` ごとに `model_list_items` を1行ずつ登録する。**行IDは転記のたびに新規採番**し、`part_instance_id`・`part_id`（インスタンスの親パーツ）・`model_name`（`instance_name`）・`quantity` を転記する。転記後は設計側への参照を持たない（外部キーなし）。
    5. **補償処理**: DB登録に失敗した場合、ステップ3で保存したファイルを削除する。
- **出力**: 作成された `PrintData` と `ModelListItem[]`。
- **補足**: 作業テンポとのトレードオフ（ジョブの作成前に必ずエクスポートが必要）は、プリントに使った最終データを保存できる唯一の手段であるため受け入れる。

### 1.4 ジョブ作成パイプライン (`PrintJobCreationPipeline`)
- **入力**: `printDataId: string`, `printerId: string`, `resinId: string`, `filmId: string`, `jobNumber: string`
- **ステップ**:
    1. **事前チェック**:
        - `printDataId` のプリントデータが存在すること。存在しなければ `NotFoundError`（**プリントデータが登録されていない＝エクスポート済みデータがない場合、ジョブは作成できない**）。
        - プリンタ・レジン・フィルムが存在すること。
        - プリンタの状態が `MAINTENANCE` の場合は `ValidationError`。`RUNNING` の場合は警告を返すが作成は可能とする (暫定。ジョブの進行状態が決まるまでの措置。`02_data_model.md` 未決事項 6)。
    2. **登録**: `print_jobs` を登録する。`jobNumber` は入力値を受け取り、`UNIQUE` 違反は `ConflictError` とする。採番ルールは未決のため、画面からの手入力（または画面側の自動提案）を受け付ける (暫定。未決事項 12)。
- **出力**: 作成された `PrintJob`。
- **副作用**: プリンタの状態は自動では更新しない（現スコープ外）。

### 1.5 結果記録パイプライン (`JobResultRecordingPipeline`)
ジョブ完了後に、製作モデルリストの行ごとの成功数・失敗数を記録する。個体は識別しない。
- **入力**: `printJobId: string`, `results: { modelListItemId: string; successCount: number; failureCount: number }[]`
- **ステップ**:
    1. **事前チェック**: ジョブの存在確認。`successCount` / `failureCount` が 0 以上の整数であること。
    2. **所属検証**: 各 `modelListItemId` の行が、ジョブの `print_data_id` に属することを確認する。他のプリントデータの行を指す場合は `ValidationError`（DB制約では強制しないため、ここで必ず検証する）。
    3. **整合チェック**: `successCount + failureCount` が行の `quantity` を超える場合は警告を返す。登録は可能とする (暫定。`02_data_model.md` 未決事項 7)。
    4. **登録（トランザクション）**: `(print_job_id, model_list_item_id)` をキーに upsert する。同一ジョブの結果は、再入力により上書きして訂正できる (暫定)。
- **出力**: 保存された `PrintResult[]`、および警告。

### 1.6 歩留まり集計 (`YieldQuery`)
結果を参照する読み取り専用の集計。保存はせず、集計時に導出する。定義は `02_data_model.md` の「7. 歩留まりの定義」に従う。
- **入力**: `groupBy: 'job' | 'part' | 'revision' | 'printData' | 'period'`、絞り込み条件（`assemblyId?`, `partId?`, `dateFrom?`, `dateTo?`）
- **集計式**:
    - 分子 = `Σ success_count`、分母 = `Σ quantity`、歩留まり = 分子 ÷ 分母。
    - `job`: ジョブのプリントデータに属する**全行**の `quantity` を分母とする（結果が未登録の行も含む）。
    - `part` / `revision` / `printData` / `period`: **結果が1行以上登録されたジョブのみ**を対象とする（未記録のジョブは除外し、除外件数を併記する）(暫定。未決事項 6, 7)。
    - `part`: `model_list_items.part_id`、`revision`: `model_list_items.part_instance_id` で分ける。改訂別の集計により、設計修正の前後を比較できる。
    - `period`: `print_jobs.created_at` で分ける。
- **出力**: グループごとの `{ successCount, failureCount, plannedQuantity, yieldRate | null }`。分母が 0 の場合は `null`（未記録）。

### 1.7 ダウンロードURL発行パイプライン (`DownloadPipeline`)
- **利用箇所**: アセンブリ詳細（パーツ・改訂履歴）、ジョブ一覧・プリントデータ一覧のダウンロードボタン。
- **入力**: `target: { kind: 'partInstance' | 'part' | 'printData'; id: string }`
- **ステップ**:
    1. **存在確認**: 対象のレコードを取得する。存在しなければ `NotFoundError`。`kind: 'part'` の場合は、そのパーツの**最新改訂**（`revision` が最大）のインスタンスに解決する。
    2. **相対パスの取得**: `part_instances.instance_url` または `print_data.print_data_url` を取得する。
    3. **署名付きURL発行**: `StorageService` を経由して一時的な閲覧URLを取得する。ダウンロード時のファイル名は、インスタンスなら「`instance_name`_rev{N}」、プリントデータなら `name` とし、拡張子はアップロード時のファイルのものを引き継ぐ（現行の `StorageService.getDownloadUrl` は `.stl` を固定で付与するため、プリントデータの形式に対応させる改修が必要）。
- **出力**: 一時的な閲覧URL。

### 1.8 プリンタ状態変更パイプライン (`PrinterStatusPipeline`)
- **入力**: `printerId: string`, `status: 'READY' | 'RUNNING' | 'MAINTENANCE'`
- **ステップ**: プリンタの存在確認の後、`status` を更新する。遷移の制限は設けない（手動の強制変更のみ。自動制御は現スコープ外）。

### 1.9 マスタ系のCRUD（パイプラインなし）
- **対象**: アセンブリ（作成・削除）、パーツ（モデル名・必要数の編集、削除）、プリンタ・レジン・フィルム（追加・削除）。
- 単一テーブルの更新で複数のサービスを跨がないため、Server Actions から Service を直接呼び出す（パイプラインは経由しない）。入力は Zod で検証する。
- **パーツの新規追加**はファイル（`model_url`）が必須で、初期インスタンスの同時作成も必要なため、`ImportPipeline` 経由に限る。
- **削除の挙動**は `02_data_model.md` §8 に従う（暫定。未決事項 18）。アセンブリ・パーツの削除は配下を `CASCADE` で削除する。ジョブから参照されているプリンタ・レジン・フィルムは `RESTRICT` により削除できず、`ConflictError` とする。パーツ・インスタンスの削除でも、製造側の記録（転記済みの `model_list_items`）は影響を受けない。

## 2. 実装詳細（提案）

### 2.1 STL解析の具体ロジック
- **ライブラリ**: `three.js` (Server-side) または `stl-reader` を使用。
- **抽出項目**:
    - ファイル名からの `model_name` 抽出（拡張子を除いたもの）。
    - 余裕があれば：バウンディングボックスサイズ（UIでの表示用）。
- **形式制限**: 旧仕様の部品番号の形式制約（`^[A-Z0-9_-]+$`）は、CADの書き出しファイル名をそのままモデル名にするため課さない (暫定)。空文字のみ拒否する。

### 2.2 ストレージのパス規約
DBには**相対パス**を保持する（絶対URLは保持しない）。バケットは現行の `stl-files` を継続して使用する。

| 対象 | パス | 保持先 |
| :--- | :--- | :--- |
| パーツの元データ（改訂 1 と共有） | `parts/{partId}/{ファイル名}` | `parts.model_url`, 初期インスタンスの `instance_url` |
| 修正後データ（改訂 2 以降） | `parts/{partId}/instances/{instanceId}/{ファイル名}` | `part_instances.instance_url` |
| プリントデータ | `print-data/{printDataId}/{ファイル名}` | `print_data.print_data_url` |

Storage 上のオブジェクトは不変として扱い、上書きや、参照中のファイルの削除をしない（`02_data_model.md` 未決事項 16）。

### 2.3 異常系の挙動
- **DB/Storage不整合への対応**:
    - **DB登録に失敗**（Storage保存済み）: 補償処理として保存済みファイルを削除する。
    - **Storage保存に失敗**: DBにはまだ何も作られていないため、保存済みの分のみ削除して中断する。
    - **補償削除に失敗**: 孤児ファイルが残る。定期クリーンアップジョブ（Edge Config または Cron）が、DB（`parts.model_url` / `part_instances.instance_url` / `print_data.print_data_url`）から参照されておらず、かつ作成から一定時間が経過したStorageオブジェクトを削除する。
    - 設計側のデータを削除（`CASCADE`）した場合のファイルも、同じクリーンアップで回収する（削除に連動させない。`02_data_model.md` §8）。
- **競合**:
    - 改訂番号の同時採番は、`UNIQUE(part_id, revision)` 違反を検知して再試行する。
    - ジョブ番号の重複は `ConflictError` とする。
- **エラー種別**（`src/shared/errors`）: `ValidationError`（入力不正・所属違反・メンテナンス中）、`NotFoundError`（対象不在）、`ConflictError`（一意制約違反）。旧仕様の `InSufficientStorageError`（Box枯渇）と `InvalidTransitionError`（工程遷移違反）は廃止する。

### 2.4 型安全の構築
- **Zod Schema**: API境界とDB境界の両方で検証する。
    - `ImportInputSchema`, `PartInstanceInputSchema`, `PrintDataInputSchema`, `PrintJobInputSchema`, `JobResultInputSchema`, `PrinterStatusSchema`, `YieldQuerySchema`, `DownloadTargetSchema`
- 旧仕様の `InsertPartItemSchema`, `UpdateStatusSchema` は廃止する。

## 3. 廃止したロジック
次のロジックは本改訂で仕様から削除した。実装も順次除去する。

- **`OrderPipeline`**（製造オーダー発行）: 個体（PartItem）の生成とBox確保。
- **`StatusUpdatePipeline`**（ステータス遷移）: 工程順序のガード、リソース再確保、履歴記録。
- **Box の確保・解放**（`StorageLogisticsService`）、排他制御（`SELECT FOR UPDATE`）、`BoxStatusPipeline`。
- **`PartItemService`**、履歴記録（`HistoryService`）。
- **パーツ登録の `PENDING` / `ACTIVE` 二段階処理**。
