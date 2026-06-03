import { supabase } from '../config/supabase';

export async function findByChecksum(checksum: string): Promise<string | null> {
  const { data } = await supabase
    .from('images')
    .select('id')
    .eq('checksum', checksum)
    .maybeSingle();

  return data?.id ?? null;
}
