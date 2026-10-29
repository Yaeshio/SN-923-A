-- ==========================================
-- 設計側 (design) スキーマ: assemblies / parts / part_instances
-- specs/02_data_model.md の 5.1 / 8、specs/05_architecture.md の 3.3 / 3.4 を参照。
--
-- 定義の元は src/shared/db/schema.ts。`npm run db:generate` の出力を整形して取り込んでいる。
-- (drizzle-kit push は RLS ポリシーの USING / WITH CHECK を落とすため使わない。テストDBもこのファイルから作る)
--
-- アクセス制御: アプリは Drizzle で直結し、トランザクション内で authenticated ロールへ切り替えて
-- (src/shared/db/rls.ts の withUser) RLS を効かせる。所有者は assemblies.owner_id で、
-- parts / part_instances は親の可視性を継承する。anon にはスキーマの権限を付与しない。
-- design は PostgREST の公開スキーマ (config.toml の api.schemas) に追加しないこと。
-- ==========================================

CREATE SCHEMA IF NOT EXISTS design;

CREATE TABLE design.assemblies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    owner_id uuid DEFAULT auth.uid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE design.parts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    assembly_id uuid NOT NULL,
    model_name text NOT NULL,
    model_url text NOT NULL,
    parts_quantity integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT parts_quantity_positive CHECK (parts_quantity > 0)
);

CREATE TABLE design.part_instances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    part_id uuid NOT NULL,
    revision integer NOT NULL,
    instance_name text NOT NULL,
    instance_url text NOT NULL,
    change_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT part_instances_part_id_revision_unique UNIQUE (part_id, revision),
    CONSTRAINT part_instances_revision_positive CHECK (revision >= 1)
);

ALTER TABLE design.assemblies ADD CONSTRAINT assemblies_owner_id_users_id_fk
    FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE design.parts ADD CONSTRAINT parts_assembly_id_assemblies_id_fk
    FOREIGN KEY (assembly_id) REFERENCES design.assemblies(id) ON DELETE CASCADE;
ALTER TABLE design.part_instances ADD CONSTRAINT part_instances_part_id_parts_id_fk
    FOREIGN KEY (part_id) REFERENCES design.parts(id) ON DELETE CASCADE;

CREATE INDEX part_instances_part_id_idx ON design.part_instances USING btree (part_id);

-- ==========================================
-- 権限 (アプリは authenticated ロールで実行する)
-- ==========================================
GRANT USAGE ON SCHEMA design TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA design TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA design GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

-- ==========================================
-- RLS: 所有者 (assemblies.owner_id) だけが CRUD できる
-- 子テーブルの EXISTS のサブクエリにも親テーブルの RLS が適用されるため、
-- 他人の行は見えず、他人の親へ子を追加することもできない。
-- ==========================================
ALTER TABLE design.assemblies ENABLE ROW LEVEL SECURITY;
ALTER TABLE design.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE design.part_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY assemblies_owner_all ON design.assemblies AS PERMISSIVE FOR ALL TO authenticated
    USING (owner_id = (SELECT auth.uid()))
    WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY parts_via_assembly ON design.parts AS PERMISSIVE FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM design.assemblies WHERE design.assemblies.id = design.parts.assembly_id))
    WITH CHECK (EXISTS (SELECT 1 FROM design.assemblies WHERE design.assemblies.id = design.parts.assembly_id));

CREATE POLICY part_instances_via_part ON design.part_instances AS PERMISSIVE FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM design.parts WHERE design.parts.id = design.part_instances.part_id))
    WITH CHECK (EXISTS (SELECT 1 FROM design.parts WHERE design.parts.id = design.part_instances.part_id));
