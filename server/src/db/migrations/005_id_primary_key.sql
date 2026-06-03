-- Recreate images table with id as first column (primary key = full filename without extension)
-- id example: "Adalbert_Stifter_Gasse_2024_07_13_001_7EE7"

-- Step 1: Rename existing table to preserve data
ALTER TABLE images RENAME TO images_old;

-- Step 2: Create new table with id first
CREATE TABLE images (
  id                TEXT PRIMARY KEY,
  hash              CHAR(4) NOT NULL,
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
    CHECK (processing_status IN ('pending','uploaded','processing','ready','error')),
  processing_error  TEXT,
  processed_at      TIMESTAMPTZ
);

-- Step 3: Copy existing data, deriving id from original_filename
INSERT INTO images
SELECT
  regexp_replace(original_filename, '\.[Dd][Nn][Gg]$', '') AS id,
  hash,
  original_filename,
  address,
  capture_date,
  sequence_number,
  s3_key_prefix,
  file_size_bytes,
  checksum,
  tags,
  upload_timestamp,
  processing_status,
  processing_error,
  processed_at
FROM images_old;

-- Step 4: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_images_hash       ON images (hash);
CREATE INDEX IF NOT EXISTS idx_images_tags       ON images USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_images_address    ON images (address text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_images_upload_ts  ON images (upload_timestamp DESC);

-- Step 5: Drop backup table
DROP TABLE images_old;

-- Step 6: Update claim function to use id
CREATE OR REPLACE FUNCTION claim_pending_image()
RETURNS TABLE(id TEXT, s3_key_prefix TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_id TEXT;
  v_prefix TEXT;
BEGIN
  UPDATE images
  SET processing_status = 'processing'
  WHERE images.id = (
    SELECT i.id FROM images i
    WHERE i.processing_status = 'uploaded'
    ORDER BY i.upload_timestamp ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING images.id, images.s3_key_prefix
  INTO v_id, v_prefix;

  IF v_id IS NOT NULL THEN
    RETURN QUERY SELECT v_id, v_prefix;
  END IF;
END;
$$;
