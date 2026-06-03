import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false }, realtime: { transport: ws } }
);

export interface PendingJob {
  id: string;          // full filename without extension
  s3_key_prefix: string;
}

export async function claimNextJob(): Promise<PendingJob | null> {
  const { data, error } = await supabase
    .from('images')
    .select('id, s3_key_prefix')
    .eq('processing_status', 'uploaded')
    .order('upload_timestamp', { ascending: true })
    .limit(1);

  if (error) throw error;
  if (!data || data.length === 0) return null;

  const row = data[0] as { id: string; s3_key_prefix: string };
  if (!row.id || !row.s3_key_prefix) {
    console.error('Invalid row from DB:', JSON.stringify(row));
    return null;
  }

  // Mark as processing
  await supabase
    .from('images')
    .update({ processing_status: 'processing' })
    .eq('id', row.id);

  console.log(`Claimed job: ${row.id}`);
  return { id: row.id, s3_key_prefix: row.s3_key_prefix };
}

export async function setStatus(
  id: string,
  status: 'processing' | 'ready' | 'error',
  errorMessage?: string
) {
  const update: Record<string, unknown> = { processing_status: status };
  if (status === 'ready') update.processed_at = new Date().toISOString();
  if (errorMessage) update.processing_error = errorMessage;

  const { error } = await supabase
    .from('images')
    .update(update)
    .eq('id', id);

  if (error) throw error;
}
