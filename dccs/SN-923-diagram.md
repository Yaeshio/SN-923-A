---
config:
  theme: dark
  layout: elk
---
flowchart LR
 subgraph UI["UI層 (Next.js App)"]
        AssemblyUI["アセンブリ一覧・詳細<br>(改訂登録・DL)"]
        ImportUI["インポート画面<br>(設計登録)"]
        PrintDataUI["プリントデータ登録画面"]
        JobUI["ジョブ管理画面<br>(作成・結果記録・DL)"]
        YieldUI["歩留まり画面"]
        MasterUI["マスタ管理画面<br>(プリンタ状態の変更)"]
  end
 subgraph Logic["ロジック層 (Server Actions / Pipeline)"]
        ImportLogic["ImportPipeline<br>(パーツ＋初期インスタンス登録)"]
        RevisionLogic["PartInstanceRegistrationPipeline<br>(改訂登録)"]
        PrintDataLogic["PrintDataRegistrationPipeline<br>(転記・登録)"]
        JobLogic["PrintJobCreationPipeline<br>(ジョブ作成)"]
        ResultLogic["JobResultRecordingPipeline<br>(結果記録)"]
        YieldLogic["YieldQuery<br>(歩留まり集計)"]
        DownloadLogic["DownloadPipeline<br>(署名付きURL発行)"]
        PrinterLogic["PrinterStatusPipeline<br>(状態の手動変更)"]
  end
 subgraph DB["DB層 (Supabase / Postgres)"]
    subgraph Design["設計側"]
        Assembly["assemblies"]
        Part["parts<br>(model_url・必要数)"]
        PartInstance["part_instances<br>(改訂・instance_url)"]
    end
    subgraph Production["製造側"]
        PrintData["print_data<br>(print_data_url)"]
        ModelList["model_list_items<br>(転記・行ごとに新規UUID)"]
        PrintJob["print_jobs"]
        PrintResult["print_results<br>(成功数・失敗数)"]
    end
    subgraph MasterT["マスタ"]
        Printer["printers<br>(status)"]
        Resin["resins"]
        Film["films"]
    end
  end
 subgraph External["外部リソース"]
        Storage["Supabase Storage<br>(STL・プリントデータ)"]
  end
    Assembly --- Part
    Part -- 派生 --- PartInstance
    PrintData --- ModelList
    PrintData --- PrintJob
    PrintJob --- PrintResult
    ModelList --- PrintResult
    Printer --- PrintJob
    Resin --- PrintJob
    Film --- PrintJob
    PartInstance -. "転記 (FKなし)" .-> ModelList

    ImportUI --> ImportLogic
    ImportLogic -- "Part + 改訂1" --> Part
    ImportLogic --> PartInstance
    ImportLogic -- STLファイル --> Storage

    AssemblyUI --> RevisionLogic
    RevisionLogic -- "改訂を追記" --> PartInstance
    RevisionLogic -- 修正後データ --> Storage

    PrintDataUI --> PrintDataLogic
    PartInstance -- "インスタンスを読み取り" --> PrintDataLogic
    PrintDataLogic --> PrintData
    PrintDataLogic --> ModelList
    PrintDataLogic -- エクスポートデータ --> Storage

    JobUI --> JobLogic
    JobLogic -- "URL必須の確認" --> PrintData
    JobLogic --> PrintJob
    JobUI --> ResultLogic
    ResultLogic -- "行の所属を検証" --> ModelList
    ResultLogic --> PrintResult

    YieldUI --> YieldLogic
    PrintResult -- 集計 --> YieldLogic
    ModelList -- 計画数 --> YieldLogic
    YieldLogic -- 歩留まり --> YieldUI

    MasterUI --> PrinterLogic
    PrinterLogic --> Printer

    AssemblyUI -- DLリクエスト --> DownloadLogic
    JobUI -- DLリクエスト --> DownloadLogic
    PrintDataUI -- DLリクエスト --> DownloadLogic
    DownloadLogic -- URLリクエスト --> Storage
    Storage -- 一時的な閲覧URL --> DownloadLogic

    style PartInstance fill:#fff9c4,stroke:#fbc02d
    style RevisionLogic fill:#fff9c4,stroke:#fbc02d
    style ModelList fill:#f1f8e9,stroke:#33691e
    style PrintResult fill:#f1f8e9,stroke:#33691e
    style YieldLogic fill:#fff9c4,stroke:#fbc02d
    style YieldUI fill:#fff9c4,stroke:#fbc02d
