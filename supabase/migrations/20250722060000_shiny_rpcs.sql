/*
  # Add RPCs for fetching unique classification values

  1. New helper functions
    - get_all_unique_segments()
    - get_all_unique_marques()
    - get_all_unique_fsmegas()
    - get_all_unique_fsfams()
    - get_all_unique_fssfas()
*/

CREATE OR REPLACE FUNCTION public.get_all_unique_segments()
RETURNS text[] LANGUAGE sql AS $$
  SELECT ARRAY(
    SELECT DISTINCT segment
    FROM brand_category_mappings
    ORDER BY segment
  );
$$;

CREATE OR REPLACE FUNCTION public.get_all_unique_marques()
RETURNS text[] LANGUAGE sql AS $$
  SELECT ARRAY(
    SELECT DISTINCT marque
    FROM brand_category_mappings
    ORDER BY marque
  );
$$;

CREATE OR REPLACE FUNCTION public.get_all_unique_fsmegas()
RETURNS integer[] LANGUAGE sql AS $$
  SELECT ARRAY(
    SELECT DISTINCT fsmega
    FROM brand_category_mappings
    ORDER BY fsmega
  );
$$;

CREATE OR REPLACE FUNCTION public.get_all_unique_fsfams()
RETURNS integer[] LANGUAGE sql AS $$
  SELECT ARRAY(
    SELECT DISTINCT fsfam
    FROM brand_category_mappings
    ORDER BY fsfam
  );
$$;

CREATE OR REPLACE FUNCTION public.get_all_unique_fssfas()
RETURNS integer[] LANGUAGE sql AS $$
  SELECT ARRAY(
    SELECT DISTINCT fssfa
    FROM brand_category_mappings
    ORDER BY fssfa
  );
$$;
