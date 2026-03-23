import { supabase } from '../lib/supabase';

export const StorageService = {
  uploadFile: async (file: any, path: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from('stl-files')
      .upload(path, file, {
        upsert: true,
      });

    if (error) {
      throw error;
    }

    return data.path;
  },

  getDownloadUrl: async (path: string, downloadName?: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from('stl-files')
      .createSignedUrl(path, 3600, {
        download: downloadName ? `${downloadName}.stl` : undefined,
      }); // 1 hour

    if (error) {
      throw error;
    }

    return data.signedUrl;
  },

  deleteFile: async (path: string): Promise<void> => {
    const { error } = await supabase.storage
      .from('stl-files')
      .remove([path]);

    if (error) {
      throw error;
    }
  },
};
