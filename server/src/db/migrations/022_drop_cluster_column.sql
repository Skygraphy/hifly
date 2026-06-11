-- Migration 022: drop cluster column (cluster is now derived from region_path)
ALTER TABLE images DROP COLUMN IF EXISTS cluster;
