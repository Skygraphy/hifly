import { supabase } from '../config/supabase';
import type { UserRole } from '../types';

export interface AppSetting {
  key: string;
  value: unknown;
  label: string;
  description: string | null;
  type: 'string' | 'boolean' | 'region' | 'image_list';
  min_role: UserRole;
  updated_at: string;
}

const ROLE_ORDER: Record<UserRole, number> = { user: 0, admin: 1, super_admin: 2 };

/** Returns settings visible to the given role */
export async function getSettings(role: UserRole): Promise<AppSetting[]> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value, label, description, type, min_role, updated_at')
    .order('key');
  if (error) throw error;

  return (data ?? []).filter(
    (s: AppSetting) => ROLE_ORDER[role] >= ROLE_ORDER[s.min_role]
  ) as AppSetting[];
}

/** Get a single setting value (for internal use) */
export async function getSetting<T = unknown>(key: string): Promise<T | null> {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (!data) return null;
  return data.value as T;
}

export async function updateSetting(key: string, value: unknown, userId: string): Promise<void> {
  const { error } = await supabase
    .from('app_settings')
    .update({ value, updated_at: new Date().toISOString(), updated_by: userId })
    .eq('key', key);
  if (error) throw error;
}
