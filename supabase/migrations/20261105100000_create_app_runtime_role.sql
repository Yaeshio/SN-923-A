-- ==========================================
-- アプリの実行用ロール app_runtime
-- specs/05_architecture.md の 3.4、specs/08_deployment_supabase.md を参照。
--
-- これまでアプリは postgres ロール (テーブル所有者 / BYPASSRLS) で接続しており、RLS が効くのは
-- 「DBアクセスは必ず withUser 経由にする」という規約のおかげだった。withUser を使い忘れても RLS が黙ってバイパスされる。
-- 接続ロール自体を「RLS をバイパスできないロール」にして、DB 側で強制する。
--
-- - NOSUPERUSER / NOBYPASSRLS: RLS を受ける。
-- - NOINHERIT: authenticated の権限を暗黙には引き継がない。withUser が SET LOCAL ROLE authenticated した間だけ、その権限を使う。
-- - design スキーマの権限は app_runtime に直接付与しない。withUser を通さないクエリは permission denied になる。
--
-- パスワードはこの migration に書かない (リポジトリに残さない)。環境ごとに設定する:
--   ALTER ROLE app_runtime PASSWORD '<password>';
-- 設定するまで、このロールはパスワード認証でログインできない。
--
-- ロールはクラスタ共通で DROP SCHEMA では消えないため、再実行できるように冪等にしてある (テストDBは毎回この migration を適用する)。
-- ==========================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_runtime') THEN
        CREATE ROLE app_runtime LOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION;
    ELSE
        ALTER ROLE app_runtime LOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION;
    END IF;
END
$$;

-- withUser の SET LOCAL ROLE authenticated を可能にする (権限は引き継がず、ロールの切り替えだけを許す)
GRANT authenticated TO app_runtime WITH INHERIT FALSE, SET TRUE;
