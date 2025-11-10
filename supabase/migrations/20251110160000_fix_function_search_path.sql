-- Migration: Fix Function search_path Vulnerability
-- Date: 2025-11-10
-- Description: Fixe vulnérabilité SQL injection search_path pour 18 fonctions
--
-- Cette migration corrige la vulnérabilité de sécurité liée au search_path
-- dans 18 fonctions de la base de données en ajoutant explicitement
-- "SECURITY DEFINER SET search_path = public, pg_temp" à chaque fonction.
--
-- Fonctions concernées:
-- - private.is_admin() (1)
-- - private.can_manage_pricing() (1)
-- - public.get_total_segments_count() (1)
-- - public.get_total_marques_count() (1)
-- - public.get_total_strategiques_count() (1)
-- - public.get_mappings_by_keys() (1)
-- - public.get_classifications_by_codes() (1)
-- - public.set_current_batch_id() (1)
-- - public.set_change_reason() (1)
-- - public.clear_audit_context() (1)
-- - public.get_all_unique_segments() (1)
-- - public.get_all_unique_marques() (1)
-- - public.get_all_unique_fsfams() (1)
-- - public.get_all_unique_fsmegas() (1)
-- - public.get_all_unique_fssfas() (1)
-- - public.update_updated_at_column() (1)
-- - public.audit_brand_mapping_changes() (1)
-- - public.audit_brand_mapping_insert() (1)
-- Total: 18 fonctions
--
-- Les étapes suivantes (0.4.2 à 0.4.7) ajouteront les ALTER FUNCTION correspondants.
--
-- ---------------------------------------------------------------------------
-- Plan d'exécution détaillé (à compléter dans les sous-étapes suivantes)
-- ---------------------------------------------------------------------------
-- 0.4.2 - Fonctions private (2)
--   * private.is_admin()
--   * private.can_manage_pricing()
ALTER FUNCTION private.is_admin()
  SET search_path = 'public, pg_temp';

ALTER FUNCTION private.can_manage_pricing()
  SET search_path = 'public, pg_temp';
--
-- 0.4.3 - Fonctions de comptage (3)
--   * public.get_total_segments_count()
--   * public.get_total_marques_count()
--   * public.get_total_strategiques_count()
ALTER FUNCTION public.get_total_segments_count()
  SET search_path = 'public, pg_temp';

ALTER FUNCTION public.get_total_marques_count()
  SET search_path = 'public, pg_temp';

ALTER FUNCTION public.get_total_strategiques_count()
  SET search_path = 'public, pg_temp';
--
-- 0.4.4 - Fonctions de récupération (2)
--   * public.get_mappings_by_keys()
--   * public.get_classifications_by_codes()
ALTER FUNCTION public.get_mappings_by_keys(text[])
  SET search_path = 'public, pg_temp';

ALTER FUNCTION public.get_classifications_by_codes(text[])
  SET search_path = 'public, pg_temp';
--
-- 0.4.5 - Fonctions de contexte import (3)
--   * public.set_current_batch_id()
--   * public.set_change_reason()
--   * public.clear_audit_context()
ALTER FUNCTION public.set_current_batch_id(uuid)
  SET search_path = 'public, pg_temp';

ALTER FUNCTION public.set_change_reason(text)
  SET search_path = 'public, pg_temp';

ALTER FUNCTION public.clear_audit_context()
  SET search_path = 'public, pg_temp';
--
-- 0.4.6 - Fonctions de références hiérarchiques (5)
--   * public.get_all_unique_segments()
--   * public.get_all_unique_marques()
--   * public.get_all_unique_fsmegas()
--   * public.get_all_unique_fsfams()
--   * public.get_all_unique_fssfas()
ALTER FUNCTION public.get_all_unique_segments()
  SET search_path = 'public, pg_temp';

ALTER FUNCTION public.get_all_unique_marques()
  SET search_path = 'public, pg_temp';

ALTER FUNCTION public.get_all_unique_fsmegas()
  SET search_path = 'public, pg_temp';

ALTER FUNCTION public.get_all_unique_fsfams()
  SET search_path = 'public, pg_temp';

ALTER FUNCTION public.get_all_unique_fssfas()
  SET search_path = 'public, pg_temp';
--
-- 0.4.7 - Fonctions utilitaires / triggers (3)
--   * public.update_updated_at_column()
--   * public.audit_brand_mapping_changes()
--   * public.audit_brand_mapping_insert()
ALTER FUNCTION public.update_updated_at_column()
  SET search_path = 'public, pg_temp';

ALTER FUNCTION public.audit_brand_mapping_changes()
  SET search_path = 'public, pg_temp';

ALTER FUNCTION public.audit_brand_mapping_insert()
  SET search_path = 'public, pg_temp';
--
-- Chaque bloc appliquera : ALTER FUNCTION ... SECURITY DEFINER SET search_path = public, pg_temp;

-- Ce fichier sert de squelette pour les étapes suivantes.
-- Les commandes ALTER FUNCTION seront ajoutées dans les étapes 0.4.2 à 0.4.7.

-- Placeholder pour garder le fichier valide SQL
SELECT 'Migration 0.4.1: Fichier de migration créé - Les ALTER FUNCTION seront ajoutés dans les étapes suivantes' AS status;
