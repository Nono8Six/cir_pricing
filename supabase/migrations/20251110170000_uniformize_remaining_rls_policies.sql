-- Migration: Uniformize Remaining RLS Policies
-- Date: 2025-11-10
-- Description: Uniformise les policies RLS restantes pour utiliser les fonctions private.*
--
-- Cette migration corrige l'incohérence détectée après l'étape 0.3 où certaines
-- tables utilisent encore des requêtes inline au lieu des fonctions private.is_admin()
-- et private.can_manage_pricing().
--
-- Tables concernées:
-- - brand_mapping_history : Policy "Admins can delete mapping history"
-- - import_batches : Policy "Admins can manage all import batches"
--
-- Objectif : Uniformiser toutes les policies pour utiliser private.is_admin()
-- au lieu de requêtes inline directes vers la table profiles.

-- ============================================================================
-- Table: brand_mapping_history
-- ============================================================================

-- DROP policy existante avec requête inline
DROP POLICY IF EXISTS "Admins can delete mapping history" ON public.brand_mapping_history;

-- CREATE policy utilisant private.is_admin()
CREATE POLICY "Admins can delete mapping history"
ON public.brand_mapping_history
FOR DELETE
TO authenticated
USING (private.is_admin());

-- ============================================================================
-- Table: import_batches
-- ============================================================================

-- DROP policy existante avec requête inline
DROP POLICY IF EXISTS "Admins can manage all import batches" ON public.import_batches;

-- CREATE policy utilisant private.is_admin()
CREATE POLICY "Admins can manage all import batches"
ON public.import_batches
FOR ALL
TO authenticated
USING (private.is_admin());

-- ============================================================================
-- Vérification
-- ============================================================================

-- Cette requête permet de vérifier que toutes les policies utilisent bien
-- les fonctions private.* au lieu de requêtes inline
-- À exécuter manuellement après migration si besoin de vérifier:
--
-- SELECT tablename, policyname, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND (qual LIKE '%private.is_admin%' OR qual LIKE '%private.can_manage_pricing%'
--        OR qual LIKE '%EXISTS%profiles%')
-- ORDER BY tablename, policyname;
