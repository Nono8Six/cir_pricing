/*
  # Add classification CIR statistics and filter support

  Adds RPC functions to count mappings with/without classification CIR values.
*/

-- Count mappings with classification CIR
CREATE OR REPLACE FUNCTION public.get_total_with_classif_cir_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COUNT(*)::integer
  FROM public.brand_category_mappings
  WHERE classif_cir IS NOT NULL AND length(trim(classif_cir)) > 0;
$$;

GRANT EXECUTE ON FUNCTION public.get_total_with_classif_cir_count() TO anon, authenticated;

-- Count mappings without classification CIR
CREATE OR REPLACE FUNCTION public.get_total_without_classif_cir_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COUNT(*)::integer
  FROM public.brand_category_mappings
  WHERE classif_cir IS NULL OR length(trim(classif_cir)) = 0;
$$;

GRANT EXECUTE ON FUNCTION public.get_total_without_classif_cir_count() TO anon, authenticated;