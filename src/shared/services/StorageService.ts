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

    const { data: { publicUrl } } = supabase.storage
      .from('stl-files')
      .getPublicUrl(path);

    return publicUrl;
  },

  getDownloadUrl: async (path: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from('stl-files')
      .createSignedUrl(path, 3600); // 1 hour

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
