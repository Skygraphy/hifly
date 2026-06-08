import { apiClient } from './client';

export interface RegionNode {
  id: string;
  name: string;
  children: RegionNode[];
}

export async function fetchRegionTree(): Promise<RegionNode[]> {
  const { data } = await apiClient.get('/regions');
  return data.data;
}

export async function createRegion(name: string, parentId: string | null): Promise<void> {
  await apiClient.post('/regions', { name, parentId });
}

export async function deleteRegion(id: string): Promise<void> {
  await apiClient.delete(`/regions/${id}`);
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
