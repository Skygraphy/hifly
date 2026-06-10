-- Relax the code column constraint: code is now optional for all levels.
-- Previously, district/municipality levels required a specific numeric format,
-- and federal/state/area were forced to NULL. Now code is free text or NULL.
ALTER TABLE geographic_regions DROP CONSTRAINT geographic_regions_code_check;
ALTER TABLE geographic_regions ADD CONSTRAINT geographic_regions_code_check
  CHECK (code IS NULL OR length(trim(code)) > 0);
