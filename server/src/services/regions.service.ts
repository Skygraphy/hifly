import { supabase } from '../config/supabase';

export interface RegionNode {
  id: string;
  name: string;
  children: RegionNode[];
}

interface FlatRegion {
  id: string;
  name: string;
  parent_id: string | null;
}

/** Returns the full hierarchy tree */
export async function getRegionTree(): Promise<RegionNode[]> {
  const { data, error } = await supabase
    .from('geographic_regions')
    .select('id, name, parent_id')
    .order('name');

  if (error) throw error;
  return buildTree((data ?? []) as FlatRegion[]);
}

function buildTree(flat: FlatRegion[], parentId: string | null = null): RegionNode[] {
  return flat
    .filter((r) => r.parent_id === parentId)
    .map((r) => ({ id: r.id, name: r.name, children: buildTree(flat, r.id) }));
}

/** Resolves the full path array for a region (e.g. ['Österreich', 'Niederösterreich', 'Klosterneuburg']) */
export async function getRegionPathById(regionId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_region_path', { region_uuid: regionId });
  if (error) throw error;
  return (data as string[]) ?? [];
}

export async function createRegion(name: string, parentId: string | null): Promise<FlatRegion> {
  const { data, error } = await supabase
    .from('geographic_regions')
    .insert({ name, parent_id: parentId })
    .select('id, name, parent_id')
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

export async function deleteRegion(id: string): Promise<void> {
  // Check for children
  const { count: childCount } = await supabase
    .from('geographic_regions')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', id);

  if ((childCount ?? 0) > 0) {
    const err = Object.assign(new Error('Cannot delete region with sub-regions'), { status: 400 });
    throw err;
  }

  // Check for assigned images
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
