-- Fix: change region_path_ids from UUID[] to TEXT[] to avoid PostgREST containment filter issues
-- PostgREST's cs (contains) operator does not reliably handle UUID[] columns via the JS client.
-- Storing UUIDs as TEXT[] is functionally identical for our filter use case.

DROP INDEX IF EXISTS idx_images_region_path_ids;

ALTER TABLE images
  ALTER COLUMN region_path_ids TYPE TEXT[] USING region_path_ids::TEXT[];

CREATE INDEX idx_images_region_path_ids ON images USING GIN (region_path_ids);

CREATE OR REPLACE FUNCTION get_region_path_ids(region_uuid UUID)
RETURNS TEXT[]
LANGUAGE sql STABLE AS $$
  WITH RECURSIVE ancestors AS (
    SELECT id, parent_id, ARRAY[id::TEXT] AS path
    FROM geographic_regions
    WHERE id = region_uuid
    UNION ALL
    SELECT g.id, g.parent_id, ARRAY[g.id::TEXT] || a.path
    FROM geographic_regions g
    JOIN ancestors a ON g.id = a.parent_id
  )
  SELECT path FROM ancestors
  ORDER BY array_length(path, 1) DESC
  LIMIT 1;
$$;

-- Re-run back-fill with the updated function
UPDATE images
SET region_path_ids = get_region_path_ids(region_id)
WHERE region_id IS NOT NULL;
