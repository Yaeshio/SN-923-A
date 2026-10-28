---
config:
  layout: elk
  theme: redux-dark
---
%% 改訂 (2026-10-28): 旧「部品個体の状態遷移図」（READY→PRINTING→CUTTING→...→SHIPPED/DISCARD/CANCELLED）は、
%% 個体管理・後工程のステータス管理の廃止に伴い削除した。現在状態遷移を持つのは、プリンタの稼働状態のみ。
%% ジョブの進行状態（02_data_model.md 未決事項 6）を採用する場合は、ここへ追記する。
stateDiagram-v2
  direction LR
  [*] --> READY:プリンタ登録

  %% 手動の強制変更のみ（自動制御は現スコープ外）。遷移の制限は設けない。
  READY --> RUNNING:手動変更
  RUNNING --> READY:手動変更
  READY --> MAINTENANCE:手動変更
  RUNNING --> MAINTENANCE:手動変更
  MAINTENANCE --> READY:手動変更
  MAINTENANCE --> RUNNING:手動変更

  READY:READY (稼働可)
  RUNNING:RUNNING (稼働中)
  MAINTENANCE:MAINTENANCE (整備中)

  note right of MAINTENANCE
    ジョブ作成時に選択不可
    (RUNNING は警告のみ)
  end note

  note right of RUNNING
    ジョブの作成・完了では
    自動で更新しない
  end note
