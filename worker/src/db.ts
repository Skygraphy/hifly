import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
);

export async function setStatus(
  hash: string,
  status: 'processing' | 'ready' | 'error',
  error?: string
) {
  const update: Record<string, unknown> = { processing_status: status };
  if (status === 'ready') update.processed_at = new Date().toISOString();
  if (error) update.processing_error = error;

  const { error: dbError } = await supabase
    .from('images')
    .update(update)
    .eq('hash', hash);

  if (dbError) throw dbError;
}
