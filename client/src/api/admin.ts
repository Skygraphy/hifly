import { apiClient } from './client';

export interface SyncStatus {
  synced: number;
  unsynced: number;
  notInFile: number;
  notInDb: number;
  total: number;
  dbTotal: number;
}

export interface SyncResult {
  updated: number;
  regionAssigned: number;
  alreadySynced: number;
  notInFile: number;
  notInDb: number;
  total: number;
  pathsRepaired: number;
  pathsBroken: number;
}

export async function fetchSyncStatus(): Promise<SyncStatus> {
  const { data } = await apiClient.get('/admin/sync-image-data/status');
  return data;
}

export async function runSync(): Promise<SyncResult> {
  const { data } = await apiClient.post('/admin/sync-image-data');
  return data;
}
