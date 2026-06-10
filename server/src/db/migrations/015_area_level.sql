-- Add 'area' (Gebiet) as a new region level below cadastral_municipality
-- Areas have no official numeric code (code must be NULL)

-- 1. Expand the level enum constraint
ALTER TABLE geographic_regions DROP CONSTRAINT geographic_regions_level_check;
ALTER TABLE geographic_regions ADD CONSTRAINT geographic_regions_level_check
  CHECK (level IN (
    'federal', 'state', 'district', 'statutory_city',
    'municipality', 'cadastral_municipality', 'area'
  ));

-- 2. Expand the code-format constraint to cover area (code must be NULL)
ALTER TABLE geographic_regions DROP CONSTRAINT geographic_regions_code_check;
ALTER TABLE geographic_regions ADD CONSTRAINT geographic_regions_code_check CHECK (
  (level IN ('federal', 'state', 'area') AND code IS NULL) OR
  (level IN ('district', 'statutory_city') AND code ~ '^\d{3}$') OR
  (level IN ('municipality', 'cadastral_municipality') AND code ~ '^\d{5}$')
);
