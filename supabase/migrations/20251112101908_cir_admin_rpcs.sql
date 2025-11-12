/*
  # CIR admin RPCs: stats & exports
*/

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

  SELECT COUNT(*) INTO total_classifications FROM public.cir_classifications;
  SELECT COUNT(*) INTO total_segments FROM public.cir_segments;
  SELECT COUNT(*) INTO total_segment_links FROM public.cir_segment_links;
  SELECT COUNT(*) INTO classification_history FROM public.cir_classification_history;
  SELECT COUNT(*) INTO segment_history FROM public.cir_segment_history;

  SELECT to_jsonb(row)
  INTO last_classification_batch
  FROM (
    SELECT id, filename, created_at, diff_summary
    FROM public.import_batches
    WHERE dataset_type = 'cir_classification'
    ORDER BY created_at DESC
    LIMIT 1
  ) AS row;

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

GRANT EXECUTE ON FUNCTION public.admin_get_cir_stats() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_export_cir_classifications_csv()
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  csv text;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  WITH ordered AS (
    SELECT
      fsmega_code,
      fsmega_designation,
      fsfam_code,
      fsfam_designation,
      fssfa_code,
      fssfa_designation,
      combined_code
    FROM public.cir_classifications
    ORDER BY fsmega_code, fsfam_code, fssfa_code
  )
  SELECT
    string_agg(
      format(
        '%s;%s;%s;%s;%s;%s;%s',
        fsmega_code,
        quote_nullable(fsmega_designation),
        fsfam_code,
        quote_nullable(fsfam_designation),
        fssfa_code,
        quote_nullable(fssfa_designation),
        combined_code
      ),
      E'\n'
    )
  INTO csv
  FROM ordered;

  RETURN convert_to(E'\ufeff' || 'FSMEGA;FSMEGA_LIB;FSFAM;FSFAM_LIB;FSSFA;FSSFA_LIB;COMBINED' || E'\n' || COALESCE(csv, ''), 'UTF8');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_export_cir_classifications_csv() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_export_cir_segments_csv()
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  csv text;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  WITH joined AS (
    SELECT
      seg.code AS segment_code,
      seg.name AS segment_name,
      seg.description,
      seg.active,
      link.combined_code,
      class.fsmega_code,
      class.fsfam_code,
      class.fssfa_code
    FROM public.cir_segments seg
    LEFT JOIN public.cir_segment_links link ON link.segment_id = seg.id
    LEFT JOIN public.cir_classifications class ON class.combined_code = link.combined_code
    ORDER BY seg.code, link.combined_code
  )
  SELECT
    string_agg(
      format(
        '%s;%s;%s;%s;%s;%s;%s;%s',
        segment_code,
        quote_nullable(segment_name),
        quote_nullable(description),
        active,
        combined_code,
        fsmega_code,
        fsfam_code,
        fssfa_code
      ),
      E'\n'
    )
  INTO csv
  FROM joined;

  RETURN convert_to(E'\ufeff' || 'SEGMENT;NAME;DESCRIPTION;ACTIVE;COMBINED_CODE;FSMEGA;FSFAM;FSSFA' || E'\n' || COALESCE(csv, ''), 'UTF8');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_export_cir_segments_csv() TO anon, authenticated;

