/*
  # Rebuild mapping RPCs with schema-qualified references

  ## What
  - Recreate all RPC helpers used by the Mapping UI with `SECURITY DEFINER`
    and an explicit `search_path`.
  - Ensure each function references `public.brand_category_mappings`
    explicitly to avoid runtime `42P01` errors when `search_path`
    is overridden.
  - Grant execute privileges to `anon` and `authenticated`
    roles so the REST API can expose the RPC endpoints.
  - Guarantee the presence of the `natural_key` generated column that is
    required for deterministic lookups during imports.

  ## Why
  - Without schema-qualified references the functions failed with
    `relation "brand_category_mappings" does not exist` depending on the
    effective `search_path`.
  - Missing privileges caused PostgREST to respond with 404 (resource not
    found) when the frontend tried to call the RPC endpoints.
  - The natural key column was missing on some environments which broke
    RPCs relying on it.
*/

-- Ensure natural_key exists and stays in sync with marque/cat_fab
ALTER TABLE IF EXISTS public.brand_category_mappings
  ADD COLUMN IF NOT EXISTS natural_key text
  GENERATED ALWAYS AS (
    lower(marque) || '|' || upper(cat_fab)
  ) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_category_mappings_natural_key
  ON public.brand_category_mappings(natural_key);

-- Unique segments -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_all_unique_segments()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    array_agg(segment ORDER BY segment),
    ARRAY[]::text[]
  )
  FROM (
    SELECT DISTINCT segment
    FROM public.brand_category_mappings
    WHERE segment IS NOT NULL AND length(trim(segment)) > 0
  ) AS ordered_segments;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_unique_segments() TO anon, authenticated;

-- Unique marques ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_all_unique_marques()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    array_agg(marque ORDER BY marque),
    ARRAY[]::text[]
  )
  FROM (
    SELECT DISTINCT marque
    FROM public.brand_category_mappings
    WHERE marque IS NOT NULL AND length(trim(marque)) > 0
  ) AS ordered_marques;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_unique_marques() TO anon, authenticated;

-- Unique FSMEGA -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_all_unique_fsmegas()
RETURNS integer[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    array_agg(fsmega ORDER BY fsmega),
    ARRAY[]::integer[]
  )
  FROM (
    SELECT DISTINCT fsmega
    FROM public.brand_category_mappings
    WHERE fsmega IS NOT NULL
  ) AS ordered_fsmegas;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_unique_fsmegas() TO anon, authenticated;

-- Unique FSFAM --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_all_unique_fsfams()
RETURNS integer[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    array_agg(fsfam ORDER BY fsfam),
    ARRAY[]::integer[]
  )
  FROM (
    SELECT DISTINCT fsfam
    FROM public.brand_category_mappings
    WHERE fsfam IS NOT NULL
  ) AS ordered_fsfams;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_unique_fsfams() TO anon, authenticated;

-- Unique FSSFA --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_all_unique_fssfas()
RETURNS integer[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    array_agg(fssfa ORDER BY fssfa),
    ARRAY[]::integer[]
  )
  FROM (
    SELECT DISTINCT fssfa
    FROM public.brand_category_mappings
    WHERE fssfa IS NOT NULL
  ) AS ordered_fssfas;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_unique_fssfas() TO anon, authenticated;

-- Total unique segments -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_total_segments_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COUNT(DISTINCT segment)
  FROM public.brand_category_mappings
  WHERE segment IS NOT NULL AND length(trim(segment)) > 0;
$$;

GRANT EXECUTE ON FUNCTION public.get_total_segments_count() TO anon, authenticated;

-- Total unique marques ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_total_marques_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COUNT(DISTINCT marque)
  FROM public.brand_category_mappings
  WHERE marque IS NOT NULL AND length(trim(marque)) > 0;
$$;

GRANT EXECUTE ON FUNCTION public.get_total_marques_count() TO anon, authenticated;

-- Total strategiques --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_total_strategiques_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COUNT(*)
  FROM public.brand_category_mappings
  WHERE strategiq = 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_total_strategiques_count() TO anon, authenticated;

-- Lookup mappings by natural keys ------------------------------------------
CREATE OR REPLACE FUNCTION public.get_mappings_by_keys(keys text[])
RETURNS SETOF public.brand_category_mappings
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT bcm.*
  FROM public.brand_category_mappings AS bcm
  WHERE COALESCE(
          bcm.natural_key,
          lower(bcm.marque) || '|' || upper(bcm.cat_fab)
        ) = ANY(keys);
$$;

GRANT EXECUTE ON FUNCTION public.get_mappings_by_keys(text[]) TO anon, authenticated;
