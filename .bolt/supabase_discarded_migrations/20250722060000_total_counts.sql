/*
  # Add SQL functions for statistics counts
*/

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
