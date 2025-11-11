/*
  # Patch admin mapping RPCs for pg_safeupdate

  ## What
  - Recreate admin_purge_mapping_history() and admin_purge_mapping_data() so that each DELETE statement uses an explicit WHERE clause.

  ## Why
  - The Supabase project enables the pg_safeupdate extension, which blocks DELETE/UPDATE without WHERE or LIMIT (error: "DELETE requires a WHERE clause").
  - The previous implementations issued bare DELETE statements, causing every purge attempt to fail with HTTP 400.
*/

CREATE OR REPLACE FUNCTION public.admin_purge_mapping_history()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_count integer := 0;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required' USING ERRCODE = '42501';
  END IF;

  WITH deleted AS (
    DELETE FROM public.brand_mapping_history
    WHERE history_id IS NOT NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN jsonb_build_object('deleted_rows', COALESCE(deleted_count, 0));
END;
$$;

COMMENT ON FUNCTION public.admin_purge_mapping_history()
  IS 'Deletes every row from brand_mapping_history (admin only) and returns the deleted count. Compatible with pg_safeupdate.';

GRANT EXECUTE ON FUNCTION public.admin_purge_mapping_history() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_purge_mapping_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  history_deleted integer := 0;
  mappings_deleted integer := 0;
  batches_deleted integer := 0;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required' USING ERRCODE = '42501';
  END IF;

  WITH deleted AS (
    DELETE FROM public.brand_mapping_history
    WHERE history_id IS NOT NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO history_deleted FROM deleted;

  WITH deleted AS (
    DELETE FROM public.brand_category_mappings
    WHERE id IS NOT NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO mappings_deleted FROM deleted;

  WITH deleted AS (
    DELETE FROM public.import_batches
    WHERE id IS NOT NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO batches_deleted FROM deleted;

  RETURN jsonb_build_object(
    'deleted_history_rows', COALESCE(history_deleted, 0),
    'deleted_mapping_rows', COALESCE(mappings_deleted, 0),
    'deleted_import_batches', COALESCE(batches_deleted, 0)
  );
END;
$$;

COMMENT ON FUNCTION public.admin_purge_mapping_data()
  IS 'Deletes history, brand_category_mappings, and import_batches data with WHERE clauses to satisfy pg_safeupdate, returning row counts.';

GRANT EXECUTE ON FUNCTION public.admin_purge_mapping_data() TO anon, authenticated;
