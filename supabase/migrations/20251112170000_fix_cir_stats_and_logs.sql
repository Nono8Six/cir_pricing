/*
  # Fix CIR stats and add activity logs

  Update admin_get_cir_stats to use brand_category_mappings instead of cir_segments/cir_segment_links.
  Add admin_get_recent_activity RPC to return recent import activity.
*/

-- Update admin_get_cir_stats to use the correct tables
CREATE OR REPLACE FUNCTION public.admin_get_cir_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  total_classifications integer;
  total_segments integer;
  total_segment_links integer;
  classification_history integer;
  segment_history integer;
  last_classification_batch jsonb;
  last_segment_batch jsonb;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  -- Count classifications
  SELECT COUNT(*) INTO total_classifications FROM public.cir_classifications;

  -- Count segments from brand_category_mappings (unique segments)
  SELECT COUNT(DISTINCT segment) INTO total_segments FROM public.brand_category_mappings;

  -- Count total mappings as "segment links"
  SELECT COUNT(*) INTO total_segment_links FROM public.brand_category_mappings;

  -- History counts (these tables may not exist yet, so we use 0)
  SELECT COUNT(*) INTO classification_history
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'cir_classification_history';

  IF classification_history > 0 THEN
    SELECT COUNT(*) INTO classification_history FROM public.cir_classification_history;
  ELSE
    classification_history := 0;
  END IF;

  SELECT COUNT(*) INTO segment_history
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'cir_segment_history';

  IF segment_history > 0 THEN
    SELECT COUNT(*) INTO segment_history FROM public.cir_segment_history;
  ELSE
    segment_history := 0;
  END IF;

  -- Get last classification batch
  SELECT to_jsonb(row)
  INTO last_classification_batch
  FROM (
    SELECT id, filename, created_at, diff_summary
    FROM public.import_batches
    WHERE dataset_type = 'cir_classification'
    ORDER BY created_at DESC
    LIMIT 1
  ) AS row;

  -- Get last segment batch
  SELECT to_jsonb(row)
  INTO last_segment_batch
  FROM (
    SELECT id, filename, created_at, diff_summary
    FROM public.import_batches
    WHERE dataset_type = 'cir_segment'
    ORDER BY created_at DESC
    LIMIT 1
  ) AS row;

  RETURN jsonb_build_object(
    'total_classifications', COALESCE(total_classifications, 0),
    'total_segments', COALESCE(total_segments, 0),
    'total_segment_links', COALESCE(total_segment_links, 0),
    'classification_history', COALESCE(classification_history, 0),
    'segment_history', COALESCE(segment_history, 0),
    'last_classification_import', last_classification_batch,
    'last_segment_import', last_segment_batch
  );
END;
$$;

-- Create admin_get_recent_activity RPC
CREATE OR REPLACE FUNCTION public.admin_get_recent_activity(entry_limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  activities jsonb;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  -- Get recent import batches as activity logs
  SELECT jsonb_agg(activity ORDER BY date DESC)
  INTO activities
  FROM (
    SELECT
      CASE
        WHEN dataset_type = 'cir_classification' THEN 'Import Classifications'
        WHEN dataset_type = 'cir_segment' THEN 'Import Segments'
        ELSE 'Import'
      END AS type,
      CONCAT(
        filename,
        ' - ',
        CASE status
          WHEN 'completed' THEN 'Complété'
          WHEN 'failed' THEN 'Échoué'
          WHEN 'pending' THEN 'En cours'
          ELSE status
        END,
        CASE
          WHEN diff_summary IS NOT NULL THEN
            CONCAT(
              ' (+', (diff_summary->>'added')::text,
              ' ~', (diff_summary->>'updated')::text,
              ' -', (diff_summary->>'removed')::text, ')'
            )
          ELSE ''
        END
      ) AS description,
      created_at::text AS date,
      (
        SELECT email
        FROM auth.users
        WHERE id = import_batches.user_id
      ) AS user
    FROM public.import_batches
    ORDER BY created_at DESC
    LIMIT entry_limit
  ) AS activity;

  RETURN COALESCE(activities, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_recent_activity(integer) TO anon, authenticated;