-- Add 'uploaded' status: DNG is in S3 and ready for the worker to process.
-- 'pending' = image record created but upload not yet confirmed
-- 'uploaded' = DNG is in S3, worker should pick this up
-- 'processing' = worker has claimed the job
-- 'ready' = JPGs generated, done
-- 'error' = processing failed

ALTER TABLE images DROP CONSTRAINT IF EXISTS images_processing_status_check;
ALTER TABLE images ADD CONSTRAINT images_processing_status_check
  CHECK (processing_status IN ('pending','uploaded','processing','ready','error'));

-- Atomically claim the next pending image for processing.
-- Uses FOR UPDATE SKIP LOCKED so multiple workers never claim the same job.
CREATE OR REPLACE FUNCTION claim_pending_image()
RETURNS TABLE(hash CHAR(4), s3_key_prefix TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_hash CHAR(4);
  v_prefix TEXT;
BEGIN
  UPDATE images
  SET processing_status = 'processing'
  WHERE images.hash = (
    SELECT i.hash FROM images i
    WHERE i.processing_status = 'uploaded'
    ORDER BY i.upload_timestamp ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING images.hash, images.s3_key_prefix
  INTO v_hash, v_prefix;

  IF v_hash IS NOT NULL THEN
    RETURN QUERY SELECT v_hash, v_prefix;
  END IF;
END;
$$;
