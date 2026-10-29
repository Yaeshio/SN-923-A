import { createClient } from '../lib/supabase/server';

const BUCKET = 'stl-files';

// ログインユーザーのセッション付きクライアントで呼ぶ。storage.objects の RLS (オーナー別フォルダ) がそのユーザーに適用される。
export const StorageService = {
  uploadFile: async (file: Blob, path: string): Promise<string> => {
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        // オブジェクトは不変として扱い、上書きしない
        upsert: false,
        // ブラウザによって STL の MIME が異なる (Windows は application/vnd.ms-pki.stl) ため、バケットの許可 MIME に固定する
        contentType: 'application/octet-stream',
      });

    if (error) {
      throw error;
    }

    return data.path;
  },

  // downloadName は拡張子を含む保存時のファイル名
  getDownloadUrl: async (path: string, downloadName?: string): Promise<string> => {
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600, {
        download: downloadName,
      }); // 1 hour

    if (error) {
      throw error;
    }

    return data.signedUrl;
  },

  deleteFile: async (path: string): Promise<void> => {
    const supabase = await createClient();
    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([path]);

    if (error) {
      throw error;
    }
  },
};
