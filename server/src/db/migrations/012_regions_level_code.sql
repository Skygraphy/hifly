-- Add level and code columns to geographic_regions
ALTER TABLE geographic_regions
  ADD COLUMN level TEXT NOT NULL DEFAULT 'municipality'
    CHECK (level IN (
      'federal','state','district','statutory_city','municipality','cadastral_municipality'
    )),
  ADD COLUMN code TEXT;

-- Enforce code format per level:
--   federal / state              → code must be NULL
--   district / statutory_city    → 3-digit numeric string
--   municipality / cadastral_municipality → 5-digit numeric string
ALTER TABLE geographic_regions ADD CONSTRAINT geographic_regions_code_check CHECK (
  (level IN ('federal','state') AND code IS NULL) OR
  (level IN ('district','statutory_city') AND code ~ '^\d{3}$') OR
  (level IN ('municipality','cadastral_municipality') AND code ~ '^\d{5}$')
);

-- Seed hierarchy: Österreich → Niederösterreich → Tulln → Klosterneuburg → Klosterneuburg (KG)
-- Then set default_region_id to Gemeinde Klosterneuburg
DO $$
DECLARE
  federal_id          uuid;
  state_id            uuid;
  district_id         uuid;
  municipality_id     uuid;
BEGIN
  INSERT INTO geographic_regions (name, level, code)
    VALUES ('Österreich', 'federal', NULL)
    RETURNING id INTO federal_id;

  INSERT INTO geographic_regions (name, level, code, parent_id)
    VALUES ('Niederösterreich', 'state', NULL, federal_id)
    RETURNING id INTO state_id;

  INSERT INTO geographic_regions (name, level, code, parent_id)
    VALUES ('Tulln', 'district', '321', state_id)
    RETURNING id INTO district_id;

  INSERT INTO geographic_regions (name, level, code, parent_id)
    VALUES ('Klosterneuburg', 'municipality', '32144', district_id)
    RETURNING id INTO municipality_id;

  INSERT INTO geographic_regions (name, level, code, parent_id)
    VALUES ('Klosterneuburg', 'cadastral_municipality', '01704', municipality_id);

  UPDATE app_settings
    SET value = to_jsonb(municipality_id::text)
    WHERE key = 'default_region_id';
END;
$$;
