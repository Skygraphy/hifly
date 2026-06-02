CREATE TABLE IF NOT EXISTS images (
  hash              CHAR(4) PRIMARY KEY,
  original_filename TEXT NOT NULL,
  address           TEXT NOT NULL,
  capture_date      DATE NOT NULL,
  sequence_number   TEXT,
  s3_key_prefix     TEXT NOT NULL,
  file_size_bytes   BIGINT,
  checksum          TEXT NOT NULL UNIQUE,
  tags              TEXT[] NOT NULL DEFAULT '{}',
  upload_timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (processing_status IN ('pending','processing','ready','error')),
  processing_error  TEXT,
  processed_at      TIMESTAMPTZ
);

-- Fast tag filtering (AND containment: image must have ALL filter tags)
CREATE INDEX IF NOT EXISTS idx_images_tags ON images USING GIN (tags);

-- Address substring search
CREATE INDEX IF NOT EXISTS idx_images_address ON images (address text_pattern_ops);

-- Default gallery sort
CREATE INDEX IF NOT EXISTS idx_images_upload_ts ON images (upload_timestamp DESC);

-- Duplicate detection
CREATE UNIQUE INDEX IF NOT EXISTS idx_images_checksum ON images (checksum);
