/*
  # Admin mutation guard RPC

  Date: 2025-11-12
  Description: Expose un RPC `admin_mutation_guard`
  qui vérifie `private.is_admin()` pour sécuriser les Edge Functions
  qui effectuent des mutations sensibles.
*/

CREATE OR REPLACE FUNCTION public.admin_mutation_guard()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required' USING ERRCODE = '42501';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.admin_mutation_guard()
  IS 'Provides a reusable guard for Edge Functions to enforce private.is_admin() before running critical mutations.';

GRANT EXECUTE ON FUNCTION public.admin_mutation_guard() TO anon, authenticated;
