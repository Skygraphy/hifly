-- Back-fill region_id and region_path_ids for images where region_id is NULL.
--
-- Root cause: regions were deleted and re-seeded (migration 012) with new UUIDs.
-- ON DELETE SET NULL cleared region_id on all images, but region_path (name array)
-- was preserved. This migration restores region_id by matching region_path against
-- the current hierarchy.
--
-- Images tagged with regions that have since been renamed will NOT be matched
-- and must be re-tagged manually via the admin UI.

WITH region_name_paths AS (
  SELECT id, get_region_path(id) AS name_path
  FROM geographic_regions
)
UPDATE images
SET
  region_id       = rnp.id,
  region_path_ids = get_region_path_ids(rnp.id)
FROM region_name_paths rnp
WHERE images.region_id IS NULL
  AND images.region_path <> '{}'
  AND images.region_path = rnp.name_path;
