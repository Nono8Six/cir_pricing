-- Migration: Harden RLS Policies
-- Date: 2025-11-09
-- Description: Remplace toutes les policies USING (true) par policies basées sur roles
--
-- Cette migration durcit les RLS policies pour les tables suivantes:
-- - clients: Restreindre INSERT/UPDATE/DELETE aux admins et commercial
-- - groups: Restreindre toutes les opérations de modification aux admins
-- - cir_classifications: Restreindre toutes les opérations de modification aux admins
--
-- Les policies de lecture (SELECT) restent ouvertes aux utilisateurs authentifiés.

-- ============================================================================
-- ÉTAPE 0.3.2 : Durcissement RLS Policies - Table CLIENTS
-- ============================================================================

-- DROP les policies permissives existantes (USING true)
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can delete clients" ON public.clients;

-- CREATE policies restrictives basées sur les rôles

-- INSERT : Admins et commerciaux peuvent créer des clients
CREATE POLICY "Admins and commercial can create clients"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (private.is_admin() OR private.can_manage_pricing());

-- UPDATE : Admins et commerciaux peuvent modifier des clients
CREATE POLICY "Admins and commercial can update clients"
ON public.clients
FOR UPDATE
TO authenticated
USING (private.is_admin() OR private.can_manage_pricing())
WITH CHECK (private.is_admin() OR private.can_manage_pricing());

-- DELETE : Seuls les admins peuvent supprimer des clients
CREATE POLICY "Only admins can delete clients"
ON public.clients
FOR DELETE
TO authenticated
USING (private.is_admin());

-- NOTE: La policy SELECT "Authenticated users can read clients" est conservée (lecture ouverte OK)

-- ============================================================================
-- ÉTAPE 0.3.3 : Durcissement RLS Policies - Table GROUPS
-- ============================================================================

-- DROP les policies permissives existantes (USING true)
DROP POLICY IF EXISTS "authenticated_users_can_insert_groups" ON public.groups;
DROP POLICY IF EXISTS "authenticated_users_can_update_groups" ON public.groups;
DROP POLICY IF EXISTS "authenticated_users_can_delete_groups" ON public.groups;

-- CREATE policies restrictives basées sur les rôles (admin-only)

-- INSERT : Seuls les admins peuvent créer des groupes
CREATE POLICY "Admins can create groups"
ON public.groups
FOR INSERT
TO authenticated
WITH CHECK (private.is_admin());

-- UPDATE : Seuls les admins peuvent modifier des groupes
CREATE POLICY "Admins can update groups"
ON public.groups
FOR UPDATE
TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());

-- DELETE : Seuls les admins peuvent supprimer des groupes
CREATE POLICY "Admins can delete groups"
ON public.groups
FOR DELETE
TO authenticated
USING (private.is_admin());

-- NOTE: La policy SELECT "authenticated_users_can_read_groups" est conservée (lecture ouverte OK)

-- ============================================================================
-- ÉTAPE 0.3.4 : Durcissement RLS Policies - Table CIR_CLASSIFICATIONS
-- (À compléter dans l'étape suivante)
-- ============================================================================
