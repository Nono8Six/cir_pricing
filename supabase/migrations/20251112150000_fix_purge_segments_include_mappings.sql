/*
  # Fix admin_purge_cir_segments to include brand_category_mappings

  Issue: The purge function was only deleting cir_segments and cir_segment_links,
  but not brand_category_mappings which are displayed in the Mappings tab.

  This migration updates the function to also purge brand_category_mappings.
*/

CREATE OR REPLACE FUNCTION public.admin_purge_cir_segments()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  brand_mappings_deleted integer := 0;
  segment_links_deleted integer := 0;
  segments_deleted integer := 0;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  -- Delete brand category mappings (displayed in Mappings tab)
  WITH deleted AS (
    DELETE FROM public.brand_category_mappings
    WHERE id IS NOT NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO brand_mappings_deleted FROM deleted;

  -- Delete segment links
  WITH deleted AS (
    DELETE FROM public.cir_segment_links
    WHERE id IS NOT NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO segment_links_deleted FROM deleted;

  -- Delete segments
  WITH deleted AS (
    DELETE FROM public.cir_segments
    WHERE id IS NOT NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO segments_deleted FROM deleted;

  RETURN jsonb_build_object(
    'deleted_brand_mappings', COALESCE(brand_mappings_deleted, 0),
    'deleted_segment_links', COALESCE(segment_links_deleted, 0),
    'deleted_segments', COALESCE(segments_deleted, 0)
  );
END;
$$;

-- Grant remains the same
GRANT EXECUTE ON FUNCTION public.admin_purge_cir_segments() TO anon, authenticated;