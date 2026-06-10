-- Revert migration 016: rename column 'region_id' back to 'name'
ALTER TABLE geographic_regions RENAME COLUMN region_id TO name;

-- Re-declare get_region_path to use the restored column name
CREATE OR REPLACE FUNCTION get_region_path(region_uuid UUID)
RETURNS TEXT[]
LANGUAGE sql STABLE AS $$
  WITH RECURSIVE ancestors AS (
    SELECT id, name, parent_id, ARRAY[name]::TEXT[] AS path
    FROM geographic_regions
    WHERE id = region_uuid
    UNION ALL
    SELECT g.id, g.name, g.parent_id, (g.name || a.path)::TEXT[]
    FROM geographic_regions g
    JOIN ancestors a ON g.id = a.parent_id
  )
  SELECT path FROM ancestors
  ORDER BY array_length(path, 1) DESC
  LIMIT 1;
$$;
