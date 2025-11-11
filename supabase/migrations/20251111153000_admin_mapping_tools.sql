/*
  # Admin mapping maintenance RPCs

  ## What
  - Adds three SECURITY DEFINER functions to maintain mapping data:
    * admin_cleanup_mapping_history(retention_days integer)
    * admin_purge_mapping_history()
    * admin_purge_mapping_data()
  - Each function enforces private.is_admin(), sets search_path = public, pg_temp,
    and returns the number of deleted rows for UI feedback.

  ## Why
  - The mapping settings UI (phase 0.5.7+) now calls RPC endpoints instead of
    issuing direct DELETE statements from the browser.
  - We need hardened server-side entrypoints that validate admin role and
    produce structured results consumed by the frontend to display confirmations.
*/

CREATE OR REPLACE FUNCTION public.admin_cleanup_mapping_history(retention_days integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  effective_retention integer;
  cutoff_at timestamptz;
  deleted_count integer := 0;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required' USING ERRCODE = '42501';
  END IF;

  IF retention_days IS NULL THEN
    RAISE EXCEPTION 'retention_days must not be null' USING ERRCODE = '22004';
  END IF;

  effective_retention := GREATEST(retention_days, 1);
  cutoff_at := NOW() - make_interval(days => effective_retention);

  WITH deleted AS (
    DELETE FROM public.brand_mapping_history
    WHERE changed_at < cutoff_at
    RETURNING 1
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN jsonb_build_object('deleted_rows', COALESCE(deleted_count, 0));
END;
$$;

COMMENT ON FUNCTION public.admin_cleanup_mapping_history(integer)
  IS 'Deletes brand_mapping_history rows older than retention_days (minimum 1 day) and returns the deleted count.';

GRANT EXECUTE ON FUNCTION public.admin_cleanup_mapping_history(integer) TO anon, authenticated;

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
    RETURNING 1
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN jsonb_build_object('deleted_rows', COALESCE(deleted_count, 0));
END;
$$;

COMMENT ON FUNCTION public.admin_purge_mapping_history()
  IS 'Deletes every row from brand_mapping_history (admin only) and returns the deleted count.';

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
    RETURNING 1
  )
  SELECT COUNT(*) INTO history_deleted FROM deleted;

  WITH deleted AS (
    DELETE FROM public.brand_category_mappings
    RETURNING 1
  )
  SELECT COUNT(*) INTO mappings_deleted FROM deleted;

  WITH deleted AS (
    DELETE FROM public.import_batches
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
  IS 'Deletes history, brand_category_mappings, and import_batches data (in that order) and returns individual row counts.';

GRANT EXECUTE ON FUNCTION public.admin_purge_mapping_data() TO anon, authenticated;

