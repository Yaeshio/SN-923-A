import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
// Use the service role key to manage storage
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function initStorage() {
  const { data, error } = await supabase.storage.createBucket('stl-files', {
    public: false,
    allowedMimeTypes: ['application/octet-stream', 'model/stl', 'text/plain'], // STL can be binary or ascii
    fileSizeLimit: 52428800 // 50MB
  });

  if (error) {
    if (error.message === 'Bucket already exists') {
      console.log('Bucket "stl-files" already exists.');
    } else {
      console.error('Error creating bucket:', error);
    }
  } else {
    console.log('Bucket "stl-files" created successfully.');
  }
}

initStorage();
