-- Migration: Fix search_path syntax (remove quotes)
-- Date: 2025-11-11
-- Description: Corrige la syntaxe incorrecte des search_path qui utilisaient des guillemets simples

-- Fix private functions
ALTER FUNCTION private.is_admin()
  SET search_path = public, pg_temp;

ALTER FUNCTION private.can_manage_pricing()
  SET search_path = public, pg_temp;

-- Fix counting functions
ALTER FUNCTION public.get_total_segments_count()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.get_total_marques_count()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.get_total_strategiques_count()
  SET search_path = public, pg_temp;

-- Fix retrieval functions
ALTER FUNCTION public.get_mappings_by_keys(text[])
  SET search_path = public, pg_temp;

ALTER FUNCTION public.get_classifications_by_codes(text[])
  SET search_path = public, pg_temp;

-- Fix context functions
ALTER FUNCTION public.set_current_batch_id(uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.set_change_reason(text)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.clear_audit_context()
  SET search_path = public, pg_temp;

-- Fix hierarchical reference functions
ALTER FUNCTION public.get_all_unique_segments()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.get_all_unique_marques()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.get_all_unique_fsmegas()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.get_all_unique_fsfams()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.get_all_unique_fssfas()
  SET search_path = public, pg_temp;

-- Fix utility/trigger functions
ALTER FUNCTION public.update_updated_at_column()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.audit_brand_mapping_changes()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.audit_brand_mapping_insert()
  SET search_path = public, pg_temp;

SELECT 'Migration: search_path syntax corrected for 18 functions' AS status;