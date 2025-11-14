/*
  # Pipeline de merge CIR classifications

  1. Ajoute la table de staging `cir_classification_import_rows` (RLS + policies) qui stocke
     les lignes d'un lot d'import avant qu'elles ne soient propagées en production.
  2. Implémente `merge_cir_classifications(batch_id uuid)` :
     - valide que le batch est bien un dataset CIR et que l'utilisateur est admin.
     - injecte les lignes en insert/update/delete sous le contexte `cir.current_batch`.
     - retourne un résumé JSON (created/updated/removed/total) pour que l'appelant
       puisse mettre à jour `import_batches.diff_summary`.
*/

-- 1. Table de staging pour les imports CIR -----------------------------------
CREATE TABLE IF NOT EXISTS public.cir_classification_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  fsmega_code integer NOT NULL,
  fsmega_designation text NOT NULL,
  fsfam_code integer NOT NULL,
  fsfam_designation text NOT NULL,
  fssfa_code integer NOT NULL,
  fssfa_designation text NOT NULL,
  combined_code text NOT NULL,
  combined_designation text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cir_classification_import_rows_batch_code
  ON public.cir_classification_import_rows(batch_id, combined_code);

CREATE INDEX IF NOT EXISTS idx_cir_classification_import_rows_batch
  ON public.cir_classification_import_rows(batch_id);

ALTER TABLE public.cir_classification_import_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classification import admins"
  ON public.cir_classification_import_rows
  FOR ALL
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- 2. Merge SQL function -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.merge_cir_classifications(p_batch_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  dataset_type text;
  created_count integer := 0;
  updated_count integer := 0;
  removed_count integer := 0;
  total_rows integer := 0;
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

  IF dataset_type IS DISTINCT FROM 'cir_classification' THEN
    RAISE EXCEPTION 'Batch % is not a cir_classification import (dataset_type = %)',
      p_batch_uuid, dataset_type USING ERRCODE = 'P0002';
  END IF;

  SELECT COUNT(*) INTO total_rows
  FROM public.cir_classification_import_rows
  WHERE batch_id = p_batch_uuid;

  IF total_rows = 0 THEN
    RAISE EXCEPTION 'Batch % contains no classification rows', p_batch_uuid USING ERRCODE = 'P0003';
  END IF;

  PERFORM public.set_cir_batch_context(p_batch_uuid);

  BEGIN
    INSERT INTO public.cir_classifications (
      fsmega_code,
      fsmega_designation,
      fsfam_code,
      fsfam_designation,
      fssfa_code,
      fssfa_designation,
      combined_code,
      combined_designation
    )
    SELECT
      stage.fsmega_code,
      stage.fsmega_designation,
      stage.fsfam_code,
      stage.fsfam_designation,
      stage.fssfa_code,
      stage.fssfa_designation,
      stage.combined_code,
      stage.combined_designation
    FROM public.cir_classification_import_rows stage
    WHERE stage.batch_id = p_batch_uuid
      AND NOT EXISTS (
        SELECT 1
        FROM public.cir_classifications target
        WHERE target.combined_code = stage.combined_code
      );
    GET DIAGNOSTICS created_count = ROW_COUNT;

    UPDATE public.cir_classifications target
    SET
      fsmega_code = stage.fsmega_code,
      fsmega_designation = stage.fsmega_designation,
      fsfam_code = stage.fsfam_code,
      fsfam_designation = stage.fsfam_designation,
      fssfa_code = stage.fssfa_code,
      fssfa_designation = stage.fssfa_designation,
      combined_designation = stage.combined_designation,
      updated_at = now()
    FROM public.cir_classification_import_rows stage
    WHERE stage.batch_id = p_batch_uuid
      AND target.combined_code = stage.combined_code
      AND (
        target.fsmega_code IS DISTINCT FROM stage.fsmega_code OR
        target.fsmega_designation IS DISTINCT FROM stage.fsmega_designation OR
        target.fsfam_code IS DISTINCT FROM stage.fsfam_code OR
        target.fsfam_designation IS DISTINCT FROM stage.fsfam_designation OR
        target.fssfa_code IS DISTINCT FROM stage.fssfa_code OR
        target.fssfa_designation IS DISTINCT FROM stage.fssfa_designation OR
        target.combined_designation IS DISTINCT FROM stage.combined_designation
      );
    GET DIAGNOSTICS updated_count = ROW_COUNT;

    DELETE FROM public.cir_classifications target
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.cir_classification_import_rows stage
      WHERE stage.batch_id = p_batch_uuid
        AND stage.combined_code = target.combined_code
    );
    GET DIAGNOSTICS removed_count = ROW_COUNT;

    PERFORM public.clear_cir_batch_context();

    RETURN jsonb_build_object(
      'batch_id', p_batch_uuid,
      'dataset_type', 'cir_classification',
      'total_rows', total_rows,
      'created', created_count,
      'updated', updated_count,
      'removed', removed_count
    );
  EXCEPTION WHEN OTHERS THEN
    PERFORM public.clear_cir_batch_context();
    RAISE;
  END;
END;
$$;
