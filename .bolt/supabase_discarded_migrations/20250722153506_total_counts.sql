-- SQL functions to return total counts for segments, marques, and strategiques

CREATE OR REPLACE FUNCTION public.get_total_segments_count()
RETURNS bigint LANGUAGE sql AS $$
  SELECT COUNT(DISTINCT segment) FROM brand_category_mappings;
$$;

CREATE OR REPLACE FUNCTION public.get_total_marques_count()
RETURNS bigint LANGUAGE sql AS $$
  SELECT COUNT(DISTINCT marque) FROM brand_category_mappings;
$$;

CREATE OR REPLACE FUNCTION public.get_total_strategiques_count()
RETURNS bigint LANGUAGE sql AS $$
  SELECT COUNT(*) FROM brand_category_mappings WHERE strategiq = 1;
$$;

