/*
  # CIR admin purge RPCs
*/

CREATE OR REPLACE FUNCTION public.admin_purge_cir_history()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  classification_history_deleted integer := 0;
  segment_history_deleted integer := 0;
  brand_history_deleted integer := 0;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  WITH deleted AS (
    DELETE FROM public.cir_classification_history
    WHERE history_id IS NOT NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO classification_history_deleted FROM deleted;

  WITH deleted AS (
    DELETE FROM public.cir_segment_history
    WHERE history_id IS NOT NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO segment_history_deleted FROM deleted;

  WITH deleted AS (
    DELETE FROM public.brand_mapping_history
    WHERE history_id IS NOT NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO brand_history_deleted FROM deleted;

  RETURN jsonb_build_object(
    'deleted_classification_history', COALESCE(classification_history_deleted, 0),
    'deleted_segment_history', COALESCE(segment_history_deleted, 0),
    'deleted_brand_history', COALESCE(brand_history_deleted, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_purge_cir_history() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_purge_cir_classifications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  segment_links_deleted integer := 0;
  segments_deleted integer := 0;
  classifications_deleted integer := 0;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  WITH deleted AS (
    DELETE FROM public.cir_segment_links
    WHERE id IS NOT NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO segment_links_deleted FROM deleted;

  WITH deleted AS (
    DELETE FROM public.cir_segments
    WHERE id IS NOT NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO segments_deleted FROM deleted;

  WITH deleted AS (
    DELETE FROM public.cir_classifications
    WHERE combined_code IS NOT NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO classifications_deleted FROM deleted;

  RETURN jsonb_build_object(
    'deleted_segment_links', COALESCE(segment_links_deleted, 0),
    'deleted_segments', COALESCE(segments_deleted, 0),
    'deleted_classifications', COALESCE(classifications_deleted, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_purge_cir_classifications() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_purge_cir_segments()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  segment_links_deleted integer := 0;
  segments_deleted integer := 0;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  WITH deleted AS (
    DELETE FROM public.cir_segment_links
    WHERE id IS NOT NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO segment_links_deleted FROM deleted;

  WITH deleted AS (
    DELETE FROM public.cir_segments
    WHERE id IS NOT NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO segments_deleted FROM deleted;

  RETURN jsonb_build_object(
    'deleted_segment_links', COALESCE(segment_links_deleted, 0),
    'deleted_segments', COALESCE(segments_deleted, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_purge_cir_segments() TO anon, authenticated;

