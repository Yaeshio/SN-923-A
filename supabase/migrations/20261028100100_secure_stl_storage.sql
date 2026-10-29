-- ==========================================
-- STL ファイル用 Storage (stl-files バケット) の作成と、オーナー別のアクセス制御
--
-- Supabase 専用 (storage スキーマが必要)。素の PostgreSQL のテストDBには適用しない。
-- 20260331070300_loosen_rls_for_presentation.sql が設定した「誰でも全操作可」のポリシーと公開設定を撤回し、
-- ログインユーザーが自分のフォルダ ({auth.uid()}/...) だけを扱えるようにする。
-- パス規約は specs/04_logic_api.md 2.2 を参照。オブジェクトは不変として扱うため UPDATE は許可しない。
-- ==========================================

-- 非公開バケット。50MB、STL (バイナリ / ASCII) のみ
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('stl-files', 'stl-files', false, 52428800, ARRAY['application/octet-stream', 'model/stl', 'text/plain'])
ON CONFLICT (id) DO UPDATE
    SET public = false,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

-- プレゼン用の全許可ポリシーを撤回
DROP POLICY IF EXISTS "Allow all for presentation" ON storage.objects;

DROP POLICY IF EXISTS "stl-files: owner can read" ON storage.objects;
DROP POLICY IF EXISTS "stl-files: owner can upload" ON storage.objects;
DROP POLICY IF EXISTS "stl-files: owner can delete" ON storage.objects;

CREATE POLICY "stl-files: owner can read" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'stl-files' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

CREATE POLICY "stl-files: owner can upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'stl-files' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

-- 補償処理 (DB登録失敗時の保存済みファイルの削除) に必要
CREATE POLICY "stl-files: owner can delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'stl-files' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
