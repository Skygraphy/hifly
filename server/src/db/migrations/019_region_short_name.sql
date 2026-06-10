-- Add optional short_name (Kurzbezeichnung) column to geographic_regions
ALTER TABLE geographic_regions
  ADD COLUMN short_name TEXT;
