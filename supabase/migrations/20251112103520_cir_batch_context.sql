/*
  # CIR batch context helpers
*/

CREATE OR REPLACE FUNCTION public.set_cir_batch_context(batch_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM set_config('cir.current_batch', COALESCE(batch_id::text, ''), true);
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_cir_batch_context()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM set_config('cir.current_batch', '', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_cir_batch_context(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_cir_batch_context() TO anon, authenticated;

