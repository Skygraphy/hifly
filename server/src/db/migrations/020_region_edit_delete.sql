-- Cascade-update region_path display names in images when a region is renamed.
-- region_path_ids (UUID-based) is unaffected and remains the source of truth for filtering.
CREATE OR REPLACE FUNCTION update_region_path_name(
  p_old_name TEXT,
  p_new_name TEXT,
  p_region_id TEXT
)
RETURNS void LANGUAGE sql AS $$
  UPDATE images
  SET region_path = array_replace(region_path, p_old_name, p_new_name)
  WHERE region_path_ids @> ARRAY[p_region_id]::TEXT[];
$$;
