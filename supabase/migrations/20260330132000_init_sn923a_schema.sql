-- ==========================================
-- 初期化: 新規スキーマ sn923a の作成と権限設定
-- ==========================================

-- 1. スキーマ作成
CREATE SCHEMA IF NOT EXISTS sn923a;

-- 2. API ロールへの利用権限付与 (PostgREST 用)
GRANT USAGE ON SCHEMA sn923a TO anon, authenticated, service_role;

-- 3. カスタム Enum 型の定義 (sn923a スキーマ内)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'part_status' AND typnamespace = 'sn923a'::regnamespace) THEN
        CREATE TYPE sn923a.part_status AS ENUM ('PENDING', 'ACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'item_status' AND typnamespace = 'sn923a'::regnamespace) THEN
        CREATE TYPE sn923a.item_status AS ENUM ('READY', 'PRINTING', 'CUTTING', 'SANDING', 'INSPECTION', 'COMPLETED', 'SHIPPED', 'DISCARD', 'CANCELLED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'machine_status' AND typnamespace = 'sn923a'::regnamespace) THEN
        CREATE TYPE sn923a.machine_status AS ENUM ('READY', 'RUNNING', 'MAINTENANCE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'box_status' AND typnamespace = 'sn923a'::regnamespace) THEN
        CREATE TYPE sn923a.box_status AS ENUM ('AVAILABLE', 'OCCUPIED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reason_code' AND typnamespace = 'sn923a'::regnamespace) THEN
        CREATE TYPE sn923a.reason_code AS ENUM ('OPERATIONAL_ERROR', 'QUALITY_ISSUE', 'EQUIPMENT_FAILURE', 'ORDER_CANCEL');
    END IF;
END
$$;

-- ==========================================
-- テーブル作成 (隔離レイヤー & 業務ロジック)
-- ==========================================

-- 4. アプリ隔離レイヤー (ユーザー管理)
CREATE TABLE IF NOT EXISTS sn923a.app_users (
    id uuid REFERENCES auth.users(id) PRIMARY KEY,
    role text CHECK (role IN ('admin', 'worker')) DEFAULT 'worker',
    created_at timestamptz DEFAULT now()
);

-- 5. プロジェクト・パーツ管理
CREATE TABLE IF NOT EXISTS sn923a.projects (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sn923a.units (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES sn923a.projects(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sn923a.parts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    unit_id uuid REFERENCES sn923a.units(id) ON DELETE CASCADE NOT NULL,
    part_number text NOT NULL,
    stl_url text,
    created_at timestamptz DEFAULT now()
);

-- 6. 設備・資材管理
CREATE TABLE IF NOT EXISTS sn923a.machines (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    type text,
    status sn923a.machine_status DEFAULT 'READY',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sn923a.boxes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    status sn923a.box_status DEFAULT 'AVAILABLE',
    created_at timestamptz DEFAULT now()
);

-- 7. 製造品個体管理 (コア)
CREATE TABLE IF NOT EXISTS sn923a.part_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    part_id uuid REFERENCES sn923a.parts(id) ON DELETE CASCADE NOT NULL,
    machine_id uuid REFERENCES sn923a.machines(id) ON DELETE SET NULL,
    box_id uuid REFERENCES sn923a.boxes(id) ON DELETE SET NULL,
    status sn923a.item_status DEFAULT 'READY',
    updated_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- 8. 製造履歴
CREATE TABLE IF NOT EXISTS sn923a.status_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    part_item_id uuid REFERENCES sn923a.part_items(id) ON DELETE CASCADE NOT NULL,
    status_from sn923a.item_status,
    status_to sn923a.item_status NOT NULL,
    reason_code sn923a.reason_code,
    comment text,
    changed_at timestamptz DEFAULT now()
);

-- ==========================================
-- インデックス & 自動更新トリガー
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_part_items_status ON sn923a.part_items(status);
CREATE INDEX IF NOT EXISTS idx_boxes_status ON sn923a.boxes(status);

CREATE OR REPLACE FUNCTION sn923a.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_part_items_updated_at BEFORE UPDATE ON sn923a.part_items
    FOR EACH ROW EXECUTE PROCEDURE sn923a.update_updated_at_column();

-- ==========================================
-- 権限・セキュリティ設定 (RLS)
-- ==========================================

-- テーブル・ルーチン・シーケンスへの実行時権限付与
GRANT ALL ON ALL TABLES IN SCHEMA sn923a TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA sn923a TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA sn923a TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA sn923a GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA sn923a GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA sn923a GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- 隔離チェック用ヘルパー関数 (RLS ポリシーで使用)
CREATE OR REPLACE FUNCTION sn923a.is_app_user() RETURNS boolean AS $$
    SELECT EXISTS (SELECT 1 FROM sn923a.app_users WHERE id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER;

-- 動的に全テーブルへ RLS を適用
DO $$
DECLARE
    tbl_name text;
BEGIN
    FOR tbl_name IN SELECT tablename FROM pg_tables WHERE schemaname = 'sn923a'
    LOOP
        -- RLS 有効化
        EXECUTE format('ALTER TABLE sn923a.%I ENABLE ROW LEVEL SECURITY', tbl_name);
        -- デフォルト閲覧ポリシー (app_users に存在すれば閲覧可能)
        EXECUTE format('CREATE POLICY "App users can view all" ON sn923a.%I FOR SELECT USING (sn923a.is_app_user())', tbl_name);
    END LOOP;
END
$$;

-- 特定の更新・追加ポリシー
CREATE POLICY "Workers can update part_items" ON sn923a.part_items
    FOR UPDATE USING (sn923a.is_app_user()) WITH CHECK (sn923a.is_app_user());

CREATE POLICY "App users can record history" ON sn923a.status_history
    FOR INSERT WITH CHECK (sn923a.is_app_user());
