import { supabase } from '../config/supabase';

export interface TagCount {
  tag: string;
  count: number;
}

export async function getAllTags(): Promise<TagCount[]> {
  // Unnest all tags arrays and count occurrences
  const { data, error } = await supabase.rpc('get_tag_counts');
  if (error) throw error;
  return data ?? [];
}
