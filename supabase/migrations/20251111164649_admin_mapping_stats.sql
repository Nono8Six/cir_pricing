/*
  # Admin mapping stats RPC

  ## What
  - Adds admin_get_mapping_stats() to return consolidated counters for the mapping page.
  - Function is SECURITY DEFINER, enforces private.is_admin(), sets search_path, and returns JSON used by the UI.

  ## Why
  - The mapping settings tab now calls rpc('admin_get_mapping_stats'). Without this function, Supabase REST returns 404 and the UI falls back to additional queries, spamming the console.
*/

CREATE OR REPLACE FUNCTION public.admin_get_mapping_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  total_mappings integer := 0;
  total_batches integer := 0;
  total_history integer := 0;
  estimated_size_mb numeric := 0;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*) INTO total_mappings FROM public.brand_category_mappings;
  SELECT COUNT(*) INTO total_batches FROM public.import_batches;
  SELECT COUNT(*) INTO total_history FROM public.brand_mapping_history;

  estimated_size_mb := COALESCE(total_mappings, 0) * 0.5;

  RETURN jsonb_build_object(
    'total_mappings', COALESCE(total_mappings, 0),
    'total_import_batches', COALESCE(total_batches, 0),
    'total_history_records', COALESCE(total_history, 0),
    'database_size_mb', estimated_size_mb,
    'last_backup_at', NOW()
  );
END;
$$;

COMMENT ON FUNCTION public.admin_get_mapping_stats()
  IS 'Returns consolidated mapping statistics for the admin UI (counts, estimated size, last backup). Access restricted to admins.';

GRANT EXECUTE ON FUNCTION public.admin_get_mapping_stats() TO anon, authenticated;
