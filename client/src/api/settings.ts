import { apiClient } from './client';

export interface AppSetting {
  key: string;
  value: unknown;
  label: string;
  description: string | null;
  type: 'string' | 'boolean' | 'region' | 'image_list';
  min_role: 'user' | 'admin' | 'super_admin';
  updated_at: string;
}

export async function fetchSettings(): Promise<AppSetting[]> {
  const { data } = await apiClient.get('/settings');
  return data.data ?? [];
}

export async function updateSetting(key: string, value: unknown): Promise<void> {
  await apiClient.patch(`/settings/${key}`, { value });
}
