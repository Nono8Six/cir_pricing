/*
  # Pipeline de merge pour brand_category_mappings

  1. Ajoute la table de staging `brand_mapping_import_rows` avec RLS (admins only).
  2. Implémente `merge_brand_mappings(batch_id uuid)` pour insérer/mettre à jour/supprimer
     les lignes de `brand_category_mappings` à partir d'un lot importé.
  3. Ajoute la RPC `preview_diff(batch_id uuid)` qui calcule le diff (added/updated/removed/unchanged)
     sans modifier les données et persiste le résultat dans `import_batches.diff_summary`.
*/

-- 1. Table de staging pour les mappings -------------------------------------
CREATE TABLE IF NOT EXISTS public.brand_mapping_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  segment text NOT NULL,
  marque text NOT NULL,
  cat_fab text NOT NULL,
  cat_fab_l text,
  strategiq integer NOT NULL DEFAULT 0 CHECK (strategiq IN (0, 1)),
  codif_fair text,
  fsmega integer,
  fsfam integer,
  fssfa integer,
  natural_key text GENERATED ALWAYS AS (
    lower(marque) || '|' || upper(cat_fab)
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_mapping_import_rows_batch_key
  ON public.brand_mapping_import_rows(batch_id, natural_key);

CREATE INDEX IF NOT EXISTS idx_brand_mapping_import_rows_batch
  ON public.brand_mapping_import_rows(batch_id);

ALTER TABLE public.brand_mapping_import_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand mapping import admin only" ON public.brand_mapping_import_rows;
CREATE POLICY "brand mapping import admin only"
  ON public.brand_mapping_import_rows
  FOR ALL
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- 2. Fonction merge_brand_mappings ------------------------------------------
CREATE OR REPLACE FUNCTION public.merge_brand_mappings(p_batch_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  dataset_type text;
  batch_owner uuid;
  created_count integer := 0;
  updated_count integer := 0;
  removed_count integer := 0;
  total_rows integer := 0;
  summary jsonb;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  SELECT batches.dataset_type, batches.user_id
  INTO dataset_type, batch_owner
  FROM public.import_batches AS batches
  WHERE batches.id = p_batch_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Import batch % not found', p_batch_uuid USING ERRCODE = 'P0001';
  END IF;

  IF dataset_type IS DISTINCT FROM 'cir_segment' THEN
    RAISE EXCEPTION 'Batch % is not a cir_segment import (dataset_type = %)',
      p_batch_uuid, dataset_type USING ERRCODE = 'P0002';
  END IF;

  SELECT COUNT(*) INTO total_rows
  FROM public.brand_mapping_import_rows
  WHERE batch_id = p_batch_uuid;

  IF total_rows = 0 THEN
    RAISE EXCEPTION 'Batch % contains no brand mapping rows', p_batch_uuid USING ERRCODE = 'P0003';
  END IF;

  PERFORM public.set_current_batch_id(p_batch_uuid);
  PERFORM public.set_change_reason('merge_brand_mappings');

  BEGIN
    INSERT INTO public.brand_category_mappings (
      segment,
      marque,
      cat_fab,
      cat_fab_l,
      strategiq,
      codif_fair,
      fsmega,
      fsfam,
      fssfa,
      batch_id,
      created_by,
      source_type
    )
    SELECT
      stage.segment,
      stage.marque,
      stage.cat_fab,
      stage.cat_fab_l,
      stage.strategiq,
      stage.codif_fair,
      stage.fsmega,
      stage.fsfam,
      stage.fssfa,
      p_batch_uuid,
      batch_owner,
      'excel_upload'
    FROM public.brand_mapping_import_rows stage
    WHERE stage.batch_id = p_batch_uuid
      AND NOT EXISTS (
        SELECT 1
        FROM public.brand_category_mappings target
        WHERE target.natural_key = stage.natural_key
      );
    GET DIAGNOSTICS created_count = ROW_COUNT;

    UPDATE public.brand_category_mappings AS target
    SET
      segment = stage.segment,
      cat_fab_l = stage.cat_fab_l,
      strategiq = stage.strategiq,
      codif_fair = stage.codif_fair,
      fsmega = stage.fsmega,
      fsfam = stage.fsfam,
      fssfa = stage.fssfa,
      batch_id = p_batch_uuid,
      source_type = 'excel_upload'
    FROM public.brand_mapping_import_rows AS stage
    WHERE stage.batch_id = p_batch_uuid
      AND target.natural_key = stage.natural_key
      AND (
        target.segment IS DISTINCT FROM stage.segment OR
        target.cat_fab_l IS DISTINCT FROM stage.cat_fab_l OR
        target.strategiq IS DISTINCT FROM stage.strategiq OR
        target.codif_fair IS DISTINCT FROM stage.codif_fair OR
        target.fsmega IS DISTINCT FROM stage.fsmega OR
        target.fsfam IS DISTINCT FROM stage.fsfam OR
        target.fssfa IS DISTINCT FROM stage.fssfa OR
        target.source_type IS DISTINCT FROM 'excel_upload' OR
        target.batch_id IS DISTINCT FROM p_batch_uuid
      );
    GET DIAGNOSTICS updated_count = ROW_COUNT;

    DELETE FROM public.brand_category_mappings AS target
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.brand_mapping_import_rows AS stage
      WHERE stage.batch_id = p_batch_uuid
        AND stage.natural_key = target.natural_key
    );
    GET DIAGNOSTICS removed_count = ROW_COUNT;

    summary := jsonb_build_object(
      'batch_id', p_batch_uuid,
      'dataset_type', 'cir_segment',
      'total_rows', total_rows,
      'added', created_count,
      'updated', updated_count,
      'unchanged', GREATEST(total_rows - created_count - updated_count, 0),
      'removed', removed_count
    );

    UPDATE public.import_batches
    SET diff_summary = summary
    WHERE id = p_batch_uuid;

    PERFORM public.clear_audit_context();
    RETURN summary;
  EXCEPTION WHEN OTHERS THEN
    PERFORM public.clear_audit_context();
    RAISE;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.merge_brand_mappings(uuid) TO anon, authenticated;

-- 3. RPC preview_diff -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.preview_diff(p_batch_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  dataset_type text;
  total_rows integer := 0;
  added_count integer := 0;
  updated_count integer := 0;
  removed_count integer := 0;
  summary jsonb;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  SELECT batches.dataset_type
  INTO dataset_type
  FROM public.import_batches AS batches
  WHERE batches.id = p_batch_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Import batch % not found', p_batch_uuid USING ERRCODE = 'P0001';
  END IF;

  IF dataset_type IS DISTINCT FROM 'cir_segment' THEN
    RAISE EXCEPTION 'Batch % is not a cir_segment import (dataset_type = %)',
      p_batch_uuid, dataset_type USING ERRCODE = 'P0002';
  END IF;

  SELECT COUNT(*) INTO total_rows
  FROM public.brand_mapping_import_rows
  WHERE batch_id = p_batch_uuid;

  IF total_rows = 0 THEN
    RAISE EXCEPTION 'Batch % contains no brand mapping rows', p_batch_uuid USING ERRCODE = 'P0003';
  END IF;

  SELECT COUNT(*) INTO added_count
  FROM public.brand_mapping_import_rows AS stage
  LEFT JOIN public.brand_category_mappings AS target
    ON target.natural_key = stage.natural_key
  WHERE stage.batch_id = p_batch_uuid
    AND target.id IS NULL;

  SELECT COUNT(*) INTO updated_count
  FROM public.brand_mapping_import_rows AS stage
  JOIN public.brand_category_mappings AS target
    ON target.natural_key = stage.natural_key
  WHERE stage.batch_id = p_batch_uuid
    AND (
      target.segment IS DISTINCT FROM stage.segment OR
      target.cat_fab_l IS DISTINCT FROM stage.cat_fab_l OR
      target.strategiq IS DISTINCT FROM stage.strategiq OR
      target.codif_fair IS DISTINCT FROM stage.codif_fair OR
      target.fsmega IS DISTINCT FROM stage.fsmega OR
      target.fsfam IS DISTINCT FROM stage.fsfam OR
      target.fssfa IS DISTINCT FROM stage.fssfa OR
      target.source_type IS DISTINCT FROM 'excel_upload' OR
      target.batch_id IS DISTINCT FROM p_batch_uuid
    );

  SELECT COUNT(*) INTO removed_count
  FROM public.brand_category_mappings AS target
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.brand_mapping_import_rows AS stage
    WHERE stage.batch_id = p_batch_uuid
      AND stage.natural_key = target.natural_key
  );

  summary := jsonb_build_object(
    'batch_id', p_batch_uuid,
    'dataset_type', 'cir_segment',
    'total_rows', total_rows,
    'added', added_count,
    'updated', updated_count,
    'unchanged', GREATEST(total_rows - added_count - updated_count, 0),
    'removed', removed_count
  );

  UPDATE public.import_batches
  SET diff_summary = summary
  WHERE id = p_batch_uuid;

  RETURN summary;
END;
$$;

GRANT EXECUTE ON FUNCTION public.preview_diff(uuid) TO anon, authenticated;
