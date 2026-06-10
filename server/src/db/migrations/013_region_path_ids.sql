-- Add UUID-based region path column for rename-safe filtering
ALTER TABLE images
  ADD COLUMN IF NOT EXISTS region_path_ids UUID[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_images_region_path_ids ON images USING GIN (region_path_ids);

-- Mirror of get_region_path() but returns UUID array instead of name array
CREATE OR REPLACE FUNCTION get_region_path_ids(region_uuid UUID)
RETURNS UUID[]
LANGUAGE sql STABLE AS $$
  WITH RECURSIVE ancestors AS (
    SELECT id, parent_id, ARRAY[id]::UUID[] AS path
    FROM geographic_regions
    WHERE id = region_uuid
    UNION ALL
    SELECT g.id, g.parent_id, (g.id || a.path)::UUID[]
    FROM geographic_regions g
    JOIN ancestors a ON g.id = a.parent_id
  )
  SELECT path FROM ancestors
  ORDER BY array_length(path, 1) DESC
  LIMIT 1;
$$;

-- Back-fill existing images that already have a region assigned
UPDATE images
SET region_path_ids = get_region_path_ids(region_id)
WHERE region_id IS NOT NULL;
