-- ==========================================
-- プレゼンテーション用: RLS / ストレージ緩和設定
-- 全てのテーブルに対して、認証の有無を問わず全操作を許可するポリシーを追加します。
-- ==========================================

-- 1. sn923a スキーマ内の全テーブル列挙とポリシー作成
DO $$
DECLARE
    tbl_name text;
BEGIN
    FOR tbl_name IN SELECT tablename FROM pg_tables WHERE schemaname = 'sn923a'
    LOOP
        -- 既存の同名ポリシーがあれば削除 (念のため)
        EXECUTE format('DROP POLICY IF EXISTS "Allow all for presentation" ON sn923a.%I', tbl_name);
        -- 誰でも全操作(SELECT, INSERT, UPDATE, DELETE)ができるポリシーを作成
        EXECUTE format('CREATE POLICY "Allow all for presentation" ON sn923a.%I FOR ALL TO PUBLIC USING (true) WITH CHECK (true)', tbl_name);
    END LOOP;
END
$$;

-- 2. ストレージの緩和
-- バケットを公開 (Public) に設定
UPDATE storage.buckets SET public = true WHERE id = 'stl-files';

-- stl-files バケット内のオブジェクトに対して全操作を許可
DROP POLICY IF EXISTS "Allow all for presentation" ON storage.objects;
CREATE POLICY "Allow all for presentation" ON storage.objects
    FOR ALL TO PUBLIC USING (bucket_id = 'stl-files') WITH CHECK (bucket_id = 'stl-files');
