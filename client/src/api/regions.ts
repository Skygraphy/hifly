import { apiClient } from './client';

export type RegionLevel =
  | 'federal'
  | 'state'
  | 'district'
  | 'statutory_city'
  | 'municipality'
  | 'cadastral_municipality'
  | 'area';

export const REGION_LEVEL_LABELS: Record<RegionLevel, string> = {
  federal: 'Bund',
  state: 'Bundesland',
  district: 'Bezirk',
  statutory_city: 'Statutarstadt',
  municipality: 'Gemeinde',
  cadastral_municipality: 'Katastralgemeinde',
  area: 'Gebiet',
};

export interface RegionNode {
  id: string;
  name: string;
  short_name: string | null;
  level: RegionLevel;
  code: string | null;
  children: RegionNode[];
}

export async function fetchRegionTree(): Promise<RegionNode[]> {
  const { data } = await apiClient.get('/regions');
  return data.data;
}

export async function createRegion(
  name: string,
  parentId: string | null,
  level: RegionLevel,
  code: string | null,
  shortName: string | null = null,
): Promise<void> {
  await apiClient.post('/regions', { name, shortName, parentId, level, code });
}

export async function updateRegion(
  id: string,
  updates: { name?: string; shortName?: string | null; code?: string | null; level?: RegionLevel },
): Promise<void> {
  await apiClient.patch(`/regions/${id}`, updates);
}

export async function deleteRegion(id: string, force = false): Promise<void> {
  await apiClient.delete(`/regions/${id}${force ? '?force=true' : ''}`);
}

export async function updateImageRegion(imageId: string, regionId: string | null): Promise<void> {
  await apiClient.patch(`/images/${encodeURIComponent(imageId)}/region`, { regionId });
}

/** Flatten tree to a list for lookup by id */
export function flattenTree(nodes: RegionNode[]): RegionNode[] {
  return nodes.flatMap((n) => [n, ...flattenTree(n.children)]);
}

/** Find a node by id in the tree */
export function findRegion(nodes: RegionNode[], id: string): RegionNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findRegion(n.children, id);
    if (found) return found;
  }
  return null;
}
