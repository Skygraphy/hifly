import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { createRegion } from '../services/regions.service';
import { images as imageList, imageMap, BASE_REGION_PATH, CLUSTER_LETTERS } from '../image_data/klosterneuburg_stadt';

interface ClusterEntry {
  id: string;
  pathIds: string[];
}

type FlatRegion = { id: string; name: string; parent_id: string | null };

async function loadAllRegions(): Promise<FlatRegion[]> {
  const { data, error } = await supabase
    .from('geographic_regions')
    .select('id, name, parent_id');
  if (error) throw error;
  return (data ?? []) as FlatRegion[];
}

/**
 * Traverses the flat regions list by name, following BASE_REGION_PATH.
 * Returns the leaf node's id and its full path id array, or null if any step is not found.
 */
function resolveBasePath(
  allRegions: FlatRegion[],
): { leafId: string; leafPathIds: string[] } | null {
  let currentId: string | null = null;
  const pathIds: string[] = [];

  for (const name of BASE_REGION_PATH) {
    const match = allRegions.find(r => r.name === name && r.parent_id === currentId);
    if (!match) return null;
    currentId = match.id;
    pathIds.push(match.id);
  }

  return currentId ? { leafId: currentId, leafPathIds: pathIds } : null;
}

/**
 * Finds or creates cluster sub-regions (A–W) as children of the given parent.
 * Returns a map of cluster letter → { id, pathIds }.
 */
async function resolveClusterMap(
  parentId: string,
  parentPathIds: string[],
): Promise<Record<string, ClusterEntry>> {
  const { data: children, error } = await supabase
    .from('geographic_regions')
    .select('id, name')
    .eq('parent_id', parentId);
  if (error) throw error;

  const existing = new Map((children ?? []).map((c: { id: string; name: string }) => [c.name, c.id]));
  const clusterMap: Record<string, ClusterEntry> = {};

  for (const letter of CLUSTER_LETTERS) {
    let id = existing.get(letter);
    if (!id) {
      const created = await createRegion(letter, parentId, 'area', letter, null);
      id = created.id;
    }
    clusterMap[letter] = { id, pathIds: [...parentPathIds, id] };
  }

  return clusterMap;
}

export async function syncImageData(req: Request, res: Response, next: NextFunction) {
  try {
    // Phase 0 — load regions, resolve base path + cluster sub-regions
    const allRegions = await loadAllRegions();
    const regionNameMap = new Map(allRegions.map(r => [r.id, r.name]));

    const base = resolveBasePath(allRegions);
    if (!base) {
      res.status(422).json({ error: `Region path not found in DB: ${BASE_REGION_PATH.join(' › ')}` });
      return;
    }
    const clusterMap = await resolveClusterMap(base.leafId, base.leafPathIds);
    const clusterRegionIds = new Set(Object.values(clusterMap).map(e => e.id));

    // Phase 1 — metadata sync + cluster region assignment
    const { data: dbRows, error } = await supabase
      .from('images')
      .select('id, main_location, lat, lng, region_id');
    if (error) throw error;

    const rows = (dbRows ?? []) as {
      id: string;
      main_location: string | null;
      lat: number | null;
      lng: number | null;
      region_id: string | null;
    }[];

    let updated = 0;
    let alreadySynced = 0;
    let notInFile = 0;
    let regionAssigned = 0;

    for (const row of rows) {
      const meta = imageMap.get(row.id.normalize('NFC'));
      if (!meta) {
        notInFile++;
        continue;
      }

      const isSynced =
        row.main_location === meta.main_location &&
        row.lat === meta.lat_lng[0] &&
        row.lng === meta.lat_lng[1];

      const patch: Record<string, unknown> = {};

      if (!isSynced) {
        Object.assign(patch, {
          main_location:       meta.main_location,
          secondary_locations: meta.secondary_locations,
          tags:                meta.tags,
          user_tags:           meta.user_tags,
          web_visible:         meta.web_visible,
          web_ranking:         meta.web_ranking,
          print_visible:       meta.print_visible,
          print_ranking:       meta.print_ranking,
          lat:                 meta.lat_lng[0],
          lng:                 meta.lat_lng[1],
        });
      }

      // Assign/update cluster region based on file value
      const targetEntry = meta.cluster ? clusterMap[meta.cluster] : null;
      const atBaseLeaf = row.region_id === base.leafId;
      const atCluster = row.region_id !== null && clusterRegionIds.has(row.region_id);
      const atWrongCluster = atCluster && row.region_id !== targetEntry?.id;

      if (targetEntry && (!row.region_id || atBaseLeaf || atWrongCluster)) {
        // Set or correct cluster region
        Object.assign(patch, {
          region_id:       targetEntry.id,
          region_path:     [...BASE_REGION_PATH, meta.cluster],
          region_path_ids: targetEntry.pathIds,
        });
        regionAssigned++;
      } else if (!meta.cluster && atCluster) {
        // Cluster cleared in file → fall back to base leaf (Klosterneuburg Stadt)
        Object.assign(patch, {
          region_id:       base.leafId,
          region_path:     [...BASE_REGION_PATH],
          region_path_ids: [...base.leafPathIds],
        });
        regionAssigned++;
      }

      if (Object.keys(patch).length > 0) {
        const { error: ue } = await supabase.from('images').update(patch).eq('id', row.id);
        if (ue) throw ue;
        updated++;
      } else {
        alreadySynced++;
      }
    }

    // Phase 2 — repair broken region_path text arrays
    // Re-derive region_path from region_path_ids using current region names.
    // If IDs are stale (deleted region): null out the region assignment.
    const { data: regionRows, error: rrErr } = await supabase
      .from('images')
      .select('id, region_path, region_path_ids')
      .not('region_id', 'is', null);
    if (rrErr) throw rrErr;

    let pathsRepaired = 0;
    let pathsBroken = 0;

    for (const img of regionRows ?? []) {
      const pathIds = (img.region_path_ids ?? []) as string[];
      const names = pathIds.map((id: string) => regionNameMap.get(id));

      if (names.some(n => n === undefined)) {
        // One or more region UUIDs no longer exist — clear the assignment
        const { error: ue } = await supabase
          .from('images')
          .update({ region_id: null, region_path: [], region_path_ids: [] })
          .eq('id', img.id);
        if (ue) throw ue;
        pathsBroken++;
        continue;
      }

      const expectedPath = names as string[];
      const currentPath = (img.region_path ?? []) as string[];

      if (JSON.stringify(expectedPath) !== JSON.stringify(currentPath)) {
        const { error: ue } = await supabase
          .from('images')
          .update({ region_path: expectedPath })
          .eq('id', img.id);
        if (ue) throw ue;
        pathsRepaired++;
      }
    }

    const notInDb = imageList.length - rows.filter(r => imageMap.has(r.id.normalize('NFC'))).length;

    res.json({
      updated, regionAssigned, alreadySynced,
      notInFile, notInDb, total: imageList.length,
      pathsRepaired, pathsBroken,
    });
  } catch (err) {
    next(err);
  }
}

export async function syncImageDataStatus(_req: Request, res: Response, next: NextFunction) {
  try {
    const { data: dbRows, error } = await supabase
      .from('images')
      .select('id, main_location, lat, lng');
    if (error) throw error;

    const rows = (dbRows ?? []) as { id: string; main_location: string | null; lat: number | null; lng: number | null }[];

    let synced = 0;
    let unsynced = 0;
    let notInFile = 0;

    for (const row of rows) {
      const meta = imageMap.get(row.id.normalize('NFC'));
      if (!meta) {
        notInFile++;
        continue;
      }
      const isSynced =
        row.main_location === meta.main_location &&
        row.lat === meta.lat_lng[0] &&
        row.lng === meta.lat_lng[1];
      if (isSynced) synced++; else unsynced++;
    }

    const notInDb = imageList.length - rows.filter(r => imageMap.has(r.id.normalize('NFC'))).length;

    res.json({ synced, unsynced, notInFile, notInDb, total: imageList.length, dbTotal: rows.length });
  } catch (err) {
    next(err);
  }
}
