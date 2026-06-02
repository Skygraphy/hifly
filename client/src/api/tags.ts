import { apiClient } from './client';

export interface TagCount {
  tag: string;
  count: number;
}

export async function fetchTags(): Promise<TagCount[]> {
  const { data } = await apiClient.get('/tags');
  return data.data;
}
