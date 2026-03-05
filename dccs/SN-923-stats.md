---
config:
  layout: elk
  theme: redux-dark
---
stateDiagram
  direction TB
  [*] --> READY:製造オーダー発行
  READY --> PRINTING:1個体DL開始
  READY --> CANCELLED:指示取消

  PRINTING --> CUTTING
  CUTTING --> SANDING
  SANDING --> INSPECTION
  INSPECTION --> COMPLETED:合格

  %% 戻り（リワーク）
  CUTTING --> PRINTING:戻り
  SANDING --> CUTTING:戻り
  INSPECTION --> SANDING:戻り
  COMPLETED --> INSPECTION:戻り

  %% 異常系・例外系
  INSPECTION --> DISCARD:修正困難
  PRINTING --> DISCARD:造形失敗
  CUTTING --> DISCARD:切削失敗
  SANDING --> DISCARD:研磨失敗

  %% リカバリ（原状復帰）
  SHIPPED --> COMPLETED:誤操作リカバリ
  DISCARD --> READY:誤操作リカバリ (1)

  COMPLETED --> SHIPPED:組立投入
  
  SHIPPED --> DB
  DISCARD --> DB
  CANCELLED --> DB

  READY:READY (Box確保済)
  PRINTING:PRINTING (DL実行)
  INSPECTION:INSPECTION (検査)
  COMPLETED:COMPLETED (合格)
  DISCARD:DISCARD (Box解放)
  SHIPPED:SHIPPED (Box解放)
  CANCELLED:CANCELLED (Box解放)
  DB:実績DB (s4)

  note right of DISCARD 
    どの工程からでも遷移可能
    遷移時に自動でBox解放
  end note

  note right of DB
    (1): SHIPPED/DISCARD/CANCELLED からのリカバリ遷移時、
    既に Box が解放されている場合は Box を再確保するロジックが必要。
  end note