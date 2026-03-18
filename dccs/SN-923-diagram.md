---
config:
  theme: dark
  layout: elk
---
flowchart LR
 subgraph UI["UI層 (Next.js App)"]
        ImportUI["インポート画面<br>(設計登録)"]
        OrderUI["製造指示画面<br>(指示発行)"]
        BoardUI["工程管理ボード<br>(ステータス操作)"]
        DetailUI["部品詳細・DL画面<br>(ファイル取得)"]
  end
 subgraph Logic["ロジック層 (Server Actions / API)"]
        ImportLogic["インポート処理<br>(BOM登録)"]
        OrderLogic["製造実行処理<br>(個体生成)"]
        StatusLogic["ステータス更新処理<br>(履歴保存)"]
        DownloadLogic["署名付きURL発行処理<br>(DL管理)"]
  end
 subgraph DB["DB層 (Supabase / Postgres)"]
        Unit["Unit"]
        Project["Project"]
        Part["Part<br>(stl_url保持)"]
        PartItem["PartItem<br>(status保持)"]
        History["StatusHistory<br>(変更ログ)"]
        Box["Boxマスタ"]
        Machine["Machine<br>(造形機マスタ)"]
  end
 subgraph External["外部リソース"]
        Storage["Supabase Storage<br>(STLファイル)"]
  end
    Project --- Unit
    Unit --- Part
    Part -. 生成 .-> PartItem
    PartItem --- History & Box
    PartItem --- Machine
    BoardUI -- ドラッグ&ドロップ等 --> StatusLogic
    StatusLogic -- Update status --> PartItem
    StatusLogic -- Insert record --> History
    StatusLogic -- "Release Box<br>(if Discard/Shipped)" --> Box
    DetailUI -- DLリクエスト --> DownloadLogic
    DownloadLogic -- URLリクエスト --> Storage
    Storage -- 一時的な閲覧URL --> DetailUI
    ImportUI --> ImportLogic
    ImportLogic -- 部品番号 --> Part
    OrderUI --> OrderLogic
    OrderLogic --> PartItem
    ImportLogic -- STLファイル --> Storage
    n1["STLファイル"] --> ImportUI
    Part -- 部品名を取得 --> OrderLogic
    History -- ステータスを取得 --> StatusLogic
    StatusLogic -- カンバンボードなどに反映 --> BoardUI
    DownloadLogic --> DetailUI

    n1@{ shape: text}
     n1:::Ash
    classDef Aqua stroke-width:1px, stroke-dasharray:none, stroke:#46EDC8, fill:#DEFFF8, color:#378E7A
    classDef Ash stroke-width:1px, stroke-dasharray:none, stroke:#999999, fill:#EEEEEE, color:#000000
    style BoardUI fill:#fff9c4,stroke:#fbc02d
    style DetailUI fill:#fff9c4,stroke:#fbc02d
    style StatusLogic fill:#fff9c4,stroke:#fbc02d
    style DownloadLogic fill:#fff9c4,stroke:#fbc02d
    style History fill:#f1f8e9,stroke:#33691e