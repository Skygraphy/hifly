-- Geographic region hierarchy for image classification
CREATE TABLE IF NOT EXISTS geographic_regions (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name      TEXT NOT NULL,
  parent_id UUID REFERENCES geographic_regions(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, parent_id)
);

-- Add region columns to images table
ALTER TABLE images
  ADD COLUMN IF NOT EXISTS region_id   UUID REFERENCES geographic_regions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS region_path TEXT[] NOT NULL DEFAULT '{}';

-- GIN index for fast ancestor path containment queries
CREATE INDEX IF NOT EXISTS idx_images_region_path ON images USING GIN (region_path);

-- Recursive function: returns full path from root to a given region
-- e.g. get_region_path('uuid-of-klosterneuburg')
--   → ['Österreich', 'Niederösterreich', 'Klosterneuburg']
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
