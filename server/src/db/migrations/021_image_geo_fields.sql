-- Migration 021: rename address → main_location, add geo/meta columns

ALTER TABLE images RENAME COLUMN address TO main_location;

ALTER TABLE images
  ADD COLUMN IF NOT EXISTS secondary_locations TEXT[]   NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS user_tags           TEXT[]   NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS web_visible         BOOLEAN  NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS web_ranking         INTEGER  NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS print_visible       BOOLEAN  NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS print_ranking       INTEGER  NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS lat                 FLOAT8,
  ADD COLUMN IF NOT EXISTS lng                 FLOAT8;
