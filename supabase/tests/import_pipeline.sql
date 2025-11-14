BEGIN;

DO $$
DECLARE
  import_owner uuid;
  current_batch uuid;
  code_a text := format('test-cir-a-%s', substr(gen_random_uuid()::text, 1, 8));
  code_b text := format('test-cir-b-%s', substr(gen_random_uuid()::text, 1, 8));
  code_c text := format('test-cir-c-%s', substr(gen_random_uuid()::text, 1, 8));
  merge_result jsonb;
BEGIN
  SELECT id
  INTO import_owner
  FROM public.profiles
  WHERE role = 'admin'
  ORDER BY created_at DESC
  LIMIT 1;

  IF import_owner IS NULL THEN
    RAISE EXCEPTION 'Impossible de trouver un profil admin pour les tests.';
  END IF;

  INSERT INTO public.import_batches (
    filename,
    user_id,
    status,
    total_lines,
    processed_lines,
    error_lines,
    comment,
    dataset_type
  ) VALUES (
    'test-cir-classifications.csv',
    import_owner,
    'pending',
    2,
    0,
    0,
    'Tests merge_cir_classifications',
    'cir_classification'
  )
  RETURNING id INTO current_batch;

  DELETE FROM public.cir_classifications;

  INSERT INTO public.cir_classifications (
    fsmega_code,
    fsmega_designation,
    fsfam_code,
    fsfam_designation,
    fssfa_code,
    fssfa_designation,
    combined_code,
    combined_designation
  ) VALUES
    (1000, 'Mega A', 110, 'Famille A', 111, 'SFA A', code_a, 'Combined A'),
    (2000, 'Mega B', 210, 'Famille B', 211, 'SFA B', code_b, 'Combined B');

  INSERT INTO public.cir_classification_import_rows (
    batch_id,
    fsmega_code,
    fsmega_designation,
    fsfam_code,
    fsfam_designation,
    fssfa_code,
    fssfa_designation,
    combined_code,
    combined_designation
  ) VALUES
    (current_batch, 1010, 'Mega A Updated', 111, 'Famille A v2', 112, 'SFA A', code_a, 'Combined A Updated'),
    (current_batch, 3000, 'Mega C', 310, 'Famille C', 311, 'SFA C', code_c, 'Combined C');

  merge_result := public.merge_cir_classifications(current_batch);

  IF (merge_result->>'created')::int <> 1 THEN
    RAISE EXCEPTION 'expected created_count=1, got %', merge_result->>'created';
  END IF;

  IF (merge_result->>'updated')::int <> 1 THEN
    RAISE EXCEPTION 'expected updated_count=1, got %', merge_result->>'updated';
  END IF;

  IF (merge_result->>'removed')::int <> 1 THEN
    RAISE EXCEPTION 'expected removed_count=1, got %', merge_result->>'removed';
  END IF;

  IF (SELECT fsmega_designation FROM public.cir_classifications WHERE combined_code = code_a) <> 'Mega A Updated' THEN
    RAISE EXCEPTION 'code_a was not rafraîchi';
  END IF;

  IF EXISTS (SELECT 1 FROM public.cir_classifications WHERE combined_code = code_b) THEN
    RAISE EXCEPTION 'code_b devait être supprimé';
  END IF;

  IF (SELECT COUNT(*) FROM public.cir_classifications WHERE combined_code = code_c) <> 1 THEN
    RAISE EXCEPTION 'code_c absent après merge';
  END IF;
END;
$$;

DO $$
DECLARE
  import_owner uuid;
  brand_batch uuid;
  preview jsonb;
  merge_result jsonb;
  natural_key_a text := lower('Brand Test A') || '|' || upper('CF1');
  natural_key_b text := lower('Brand Test B') || '|' || upper('CF2');
  natural_key_c text := lower('Brand Test C') || '|' || upper('CF3');
BEGIN
  SELECT id
  INTO import_owner
  FROM auth.users
  ORDER BY created_at DESC
  LIMIT 1;

  IF import_owner IS NULL THEN
    RAISE EXCEPTION 'Impossible de trouver un utilisateur auth pour les tests brand mappings';
  END IF;

  INSERT INTO public.import_batches (
    filename,
    user_id,
    status,
    total_lines,
    processed_lines,
    error_lines,
    comment,
    dataset_type
  )
  VALUES (
    'test-brand.csv',
    import_owner,
    'pending',
    2,
    0,
    0,
    'Tests merge_brand_mappings',
    'cir_segment'
  )
  RETURNING id INTO brand_batch;

  DELETE FROM public.brand_mapping_history;
  DELETE FROM public.brand_category_mappings;
  DELETE FROM public.brand_mapping_import_rows WHERE batch_id = brand_batch;

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
  ) VALUES
    ('SEG-OLD', 'Brand Test A', 'CF1', 'Ancienne valeur', 0, 'OLD', 10, 11, 12, NULL, import_owner, 'manual_edit'),
    ('SEG-DEL', 'Brand Test C', 'CF3', 'A supprimer', 0, NULL, 20, 21, 22, NULL, import_owner, 'manual_edit');

  INSERT INTO public.brand_mapping_import_rows (
    batch_id,
    segment,
    marque,
    cat_fab,
    cat_fab_l,
    strategiq,
    codif_fair,
    fsmega,
    fsfam,
    fssfa
  ) VALUES
    (brand_batch, 'SEG-A2', 'Brand Test A', 'CF1', 'Nouvelle valeur', 1, 'NEW', 30, 31, 32),
    (brand_batch, 'SEG-B', 'Brand Test B', 'CF2', 'Nouvelle B', 0, NULL, 40, 41, 42);

  preview := public.preview_diff(brand_batch);

  IF (preview->>'added')::int <> 1 THEN
    RAISE EXCEPTION 'preview_diff added attendu = 1, obtenu %', preview->>'added';
  END IF;

  IF (preview->>'updated')::int <> 1 THEN
    RAISE EXCEPTION 'preview_diff updated attendu = 1, obtenu %', preview->>'updated';
  END IF;

  IF (preview->>'removed')::int <> 1 THEN
    RAISE EXCEPTION 'preview_diff removed attendu = 1, obtenu %', preview->>'removed';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.import_batches
    WHERE id = brand_batch
      AND diff_summary->>'added' = '1'
      AND diff_summary->>'updated' = '1'
      AND diff_summary->>'removed' = '1'
  ) THEN
    RAISE EXCEPTION 'diff_summary non mis à jour après preview_diff';
  END IF;

  merge_result := public.merge_brand_mappings(brand_batch);

  IF (merge_result->>'added')::int <> 1 THEN
    RAISE EXCEPTION 'merge_brand_mappings added attendu = 1, obtenu %', merge_result->>'added';
  END IF;

  IF (merge_result->>'updated')::int <> 1 THEN
    RAISE EXCEPTION 'merge_brand_mappings updated attendu = 1, obtenu %', merge_result->>'updated';
  END IF;

  IF (merge_result->>'removed')::int <> 1 THEN
    RAISE EXCEPTION 'merge_brand_mappings removed attendu = 1, obtenu %', merge_result->>'removed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.brand_category_mappings
    WHERE natural_key = natural_key_c
  ) THEN
    RAISE EXCEPTION 'Brand Test C devait être supprimé';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.brand_category_mappings
    WHERE natural_key = natural_key_b
      AND segment = 'SEG-B'
  ) THEN
    RAISE EXCEPTION 'Brand Test B devait être inséré';
  END IF;

  IF (
    SELECT segment
    FROM public.brand_category_mappings
    WHERE natural_key = natural_key_a
  ) <> 'SEG-A2' THEN
    RAISE EXCEPTION 'Brand Test A devait être mis à jour';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.import_batches
    WHERE id = brand_batch
      AND diff_summary->>'added' = '1'
      AND diff_summary->>'updated' = '1'
      AND diff_summary->>'removed' = '1'
  ) THEN
    RAISE EXCEPTION 'diff_summary non mis à jour après merge_brand_mappings';
  END IF;
END;
$$;

ROLLBACK;
