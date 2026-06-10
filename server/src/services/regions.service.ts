import { supabase } from '../config/supabase';

export type RegionLevel =
  | 'federal'
  | 'state'
  | 'district'
  | 'statutory_city'
  | 'municipality'
  | 'cadastral_municipality'
  | 'area';

export interface RegionNode {
  id: string;
  name: string;
  short_name: string | null;
  level: RegionLevel;
  code: string | null;
  children: RegionNode[];
}

interface FlatRegion {
  id: string;
  name: string;
  short_name: string | null;
  level: RegionLevel;
  code: string | null;
  parent_id: string | null;
}

/** Returns the full hierarchy tree */
export async function getRegionTree(): Promise<RegionNode[]> {
  const { data, error } = await supabase
    .from('geographic_regions')
    .select('id, name, short_name, level, code, parent_id')
    .order('name');

  if (error) throw error;
  return buildTree((data ?? []) as FlatRegion[]);
}

function buildTree(flat: FlatRegion[], parentId: string | null = null): RegionNode[] {
  return flat
    .filter((r) => r.parent_id === parentId)
    .map((r) => ({
      id: r.id,
      name: r.name,
      short_name: r.short_name,
      level: r.level,
      code: r.code,
      children: buildTree(flat, r.id),
    }));
}

/** Resolves the full path array for a region (e.g. ['Österreich', 'Niederösterreich', 'Klosterneuburg']) */
export async function getRegionPathById(regionId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_region_path', { region_uuid: regionId });
  if (error) throw error;
  return (data as string[]) ?? [];
}

/** Resolves the full path as UUID array — rename-safe alternative to getRegionPathById */
export async function getRegionPathIdsById(regionId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_region_path_ids', { region_uuid: regionId });
  if (error) throw error;
  return (data as string[]) ?? [];
}

export async function createRegion(
  name: string,
  parentId: string | null,
  level: RegionLevel,
  code: string | null,
  shortName: string | null = null,
): Promise<FlatRegion> {
  const { data, error } = await supabase
    .from('geographic_regions')
    .insert({ name, short_name: shortName, parent_id: parentId, level, code })
    .select('id, name, short_name, level, code, parent_id')
    .single();

  if (error) {
    if (error.code === '23505') {
      const err = Object.assign(new Error('Region already exists under this parent'), { status: 409 });
      throw err;
    }
    throw error;
  }
  return data as FlatRegion;
}

export async function updateRegion(
  id: string,
  updates: { name?: string; shortName?: string | null; code?: string | null; level?: RegionLevel },
): Promise<FlatRegion> {
  // If name is changing, cascade-update region_path in all affected images
  if (updates.name !== undefined) {
    const { data: current } = await supabase
      .from('geographic_regions')
      .select('name')
      .eq('id', id)
      .single();
    if (current && current.name !== updates.name) {
      await supabase.rpc('update_region_path_name', {
        p_old_name: current.name,
        p_new_name: updates.name,
        p_region_id: id,
      });
    }
  }

  const patch: Record<string, unknown> = {};
  if (updates.name !== undefined) patch.name = updates.name;
  if ('shortName' in updates) patch.short_name = updates.shortName;
  if ('code' in updates) patch.code = updates.code;
  if (updates.level !== undefined) patch.level = updates.level;

  const { data, error } = await supabase
    .from('geographic_regions')
    .update(patch)
    .eq('id', id)
    .select('id, name, short_name, level, code, parent_id')
    .single();

  if (error) {
    if (error.code === '23505') {
      const err = Object.assign(new Error('Region already exists under this parent'), { status: 409 });
      throw err;
    }
    throw error;
  }
  return data as FlatRegion;
}

/** Collects all descendant IDs (including the root id itself) via iterative BFS. */
async function collectDescendantIds(rootId: string): Promise<string[]> {
  const ids: string[] = [rootId];
  const queue = [rootId];
  while (queue.length > 0) {
    const parentId = queue.shift()!;
    const { data } = await supabase
      .from('geographic_regions')
      .select('id')
      .eq('parent_id', parentId);
    for (const row of data ?? []) {
      ids.push(row.id);
      queue.push(row.id);
    }
  }
  return ids;
}

export async function deleteRegion(id: string, force = false): Promise<void> {
  if (!force) {
    const { count: childCount } = await supabase
      .from('geographic_regions')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', id);
    if ((childCount ?? 0) > 0) {
      const err = Object.assign(new Error('Cannot delete region with sub-regions'), { status: 400 });
      throw err;
    }
    const { count: imageCount } = await supabase
      .from('images')
      .select('id', { count: 'exact', head: true })
      .eq('region_id', id);
    if ((imageCount ?? 0) > 0) {
      const err = Object.assign(new Error('Cannot delete region assigned to images'), { status: 400 });
      throw err;
    }
    const { error } = await supabase.from('geographic_regions').delete().eq('id', id);
    if (error) throw error;
    return;
  }

  // Force cascade: clear image assignments for all descendants, then delete bottom-up
  const allIds = await collectDescendantIds(id);

  // Clear region assignment for all images belonging to any of these regions
  const { error: imgErr } = await supabase
    .from('images')
    .update({ region_id: null, region_path: [], region_path_ids: [] })
    .in('region_id', allIds);
  if (imgErr) throw imgErr;

  // Delete descendants deepest-first: reverse BFS order (allIds is BFS order, so reverse it)
  for (const descId of [...allIds].reverse()) {
    const { error } = await supabase.from('geographic_regions').delete().eq('id', descId);
    if (error) throw error;
  }
}

/** Returns the name of a region by ID (for filter resolution) */
export async function getRegionName(regionId: string): Promise<string | null> {
  const { data } = await supabase
    .from('geographic_regions')
    .select('name')
    .eq('id', regionId)
    .maybeSingle();
  return data?.name ?? null;
}
