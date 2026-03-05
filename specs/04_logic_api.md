# ロジック・API仕様書 (Draft)

## 1. 業務パイプライン (Pipelines)
各ロジックは `specs/05_architecture.md` で定義されたパイプライン層として実装され、複数のサービスをオーケストレートする。

### 1.1 部品インポートパイプライン (`ImportPipeline`)
- **入力**: `files: File[]`, `projectId: string`, `unitId: string`
- **実装方針**: 
    - 開発コスト削減およびデータ不整合防止のため、すべてのステップを **同期処理（直列実行）** で行う。
    - ユーザーはアップロードから本登録完了まで画面上で待機し、途中でバックグラウンド処理への移行は行わない。
- **ステップ**:
    1. **プレ登録 (Pending)**: 
        - ファイル名から `part_number` を抽出。
        - DBに `status: "PENDING"` で `Part` レコードを作成し、一意のIDを確保。
    2. **ストレージ保存**: 
        - 確保したIDをディレクトリ構造やファイル名に含めて Firebase Storage へアップロード（例: `parts/{id}/file.stl`）。
    3. **本登録 (Activate)**: 
        - アップロード成功を受けて、DBの `stl_url` を更新し、`status: "ACTIVE"` に変更。
    4. **クリーンアップ (非同期/エラー時)**:
        - 失敗時は必要に応じて `PENDING` レコードを削除、またはリトライト対象とする。

### 1.2 製造オーダーパイプライン (`OrderPipeline`)
- **入力**: `partId: string`, `machineId: string`, `quantity: number`
- **ステップ**:
    1. **事前チェック**: 部品の存在確認と基本情報の取得。指定数以上の空きBoxがあるか確認。
    2. **ドメイン操作 (トランザクション内)**:
        - **空きBox確保**: 
            - `Box` テーブルから `status: "AVAILABLE"` かつ最小IDのレコードを、`quantity` 分取得。
            - **排他制御**: `SELECT FOR UPDATE` 等を用いて、取得対象のBoxレコードをロックする。
        - **Boxステータス更新**: 取得したBoxのステータスを `"OCCUPIED"` に更新。
        - **個体生成**: 取得した `box_id`, `machine_id` と紐付けた `PartItem` レコードを `quantity` 分一括生成（初期ステータス: `READY`）。
        - **履歴記録**: 各個体の初期履歴を `HistoryService` で記録。

### 1.3 ステータス遷移パイプライン (`StatusUpdatePipeline`)
- **入力**: `itemId: string`, `newStatus: string`, `reason_code?: string`, `comment?: string`
- **ステップ**:
    1. **遷移ルール・ガード条件チェック**:
        - `dccs/SN-923-stats.md` の状態遷移図に反する遷移を禁止。
        - **工程スキップ禁止**: 工程順序をスキップする遷移（例: `PRINTING` から `INSPECTION`）をガード条件で弾く。
    2. **リソース再確保（例外系リカバリ）**:
        - 戻り遷移やリカバリ遷移（`SHIPPED/DISCARD/CANCELLED` からの復帰）において、対象の `PartItem` に紐づく `Box` が既に解放されている、あるいは現在 `"AVAILABLE"` 状態である場合、`OrderPipeline` のロジックと同様に利用可能な Box を再割り当てする。
    3. **ドメイン更新 (トランザクション内)**:
        - `ProductionControlService` により `PartItem` のステータスを更新。
        - ステータスが `SHIPPED`, `DISCARD`, または `CANCELLED` に遷移する場合、`StorageLogisticsService` を通じて紐付いている `Box` を解放する。
    4. **履歴記録**:
        - `HistoryService` により、`reason_code` と `comment` を含む詳細な履歴を保存。

### 1.4 ダウンロードURL発行パイプライン (`DownloadPipeline`)
- **入力**: `partId: string`
- **ステップ**:
    1. 部品のアクセス権限（存在確認）チェック。
    2. `StorageService` を経由して一時的な閲覧URLを取得。

## 3. 実装詳細（提案）

### 3.1 STL解析の具体ロジック
- **ライブラリ**: `three.js` (Server-side) または `stl-reader` を使用。
- **抽出項目**: 
    - メタデータからの `part_number` 抽出（ファイル名優先）。
    - 余裕があれば：バウンディングボックスサイズ（UIでの表示用）。
- **正規表現例**: `PartNumber` は `^[A-Z0-9_-]+$` とし、ファイル名から拡張子を除いた部分を初期値とする。

### 3.2 異常系の挙動
- **DB/Storage不整合への対応**:
    - `Storage` 保存失敗時：`Transaction` がロールバックされるため DB の `PENDING` レコードも生成されない（または削除）。
    - 致命的なエラー（DB更新失敗だがStorage保存済み）：定期的なクリーンアップジョブ（Edge Config または Cron）により、`PENDING` かつ一定時間経過した `Part` に紐づく Storage ファイルを削除する。
- **Box枯渇時の挙動**: 
    - `OrderPipeline` 内で例外 `InSufficientStorageError` をスローし、UI側で「空きBoxが不足しています。出荷済みBoxの解放を確認してください」という警告トーストを表示する。

### 3.3 型安全の構築
- **Zod Schema**: 
    - `InsertPartItemSchema`, `UpdateStatusSchema` を定義し、API境界とDB境界の両方で検証する。
