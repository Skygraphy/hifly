-- Aggregate tag usage counts across all images
CREATE OR REPLACE FUNCTION get_tag_counts()
RETURNS TABLE(tag TEXT, count BIGINT)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    unnested.tag,
    COUNT(*) AS count
  FROM images, unnest(tags) AS unnested(tag)
  GROUP BY unnested.tag
  ORDER BY count DESC, unnested.tag ASC;
$$;
