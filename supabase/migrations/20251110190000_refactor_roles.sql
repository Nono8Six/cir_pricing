-- Migration: Refactor Roles (Eliminate NULL)
-- Date: 2025-11-10
-- Description: Refonte complète du système de rôles pour éliminer NULL
--
-- Contexte:
-- L'utilisation de NULL pour représenter un rôle "viewer" est dangereuse et ambiguë.
-- Cette migration renomme et clarifie tous les rôles pour refléter la structure métier CIR.
--
-- Structure CIR (distributeur matériel industriel):
-- - Administrateurs IT (gestion système)
-- - Responsables commerciaux/agence (gestion complète métier)
-- - Technico-commerciaux terrain (consultation uniquement)
--
-- Changements:
-- NULL → 'technico_commercial' (lecture seule)
-- 'commercial' → 'responsable' (gestion complète)
-- 'admin' → 'admin' (inchangé)
--
-- IMPORTANT: Cette migration modifie les données, les fonctions, et les contraintes.

-- ============================================================================
-- ÉTAPE 1: Supprimer temporairement la contrainte CHECK
-- ============================================================================

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- ============================================================================
-- ÉTAPE 2: Migrer les données existantes
-- ============================================================================

-- Migrer NULL → 'technico_commercial'
UPDATE public.profiles
SET role = 'technico_commercial'
WHERE role IS NULL;

-- Migrer 'commercial' → 'responsable'
UPDATE public.profiles
SET role = 'responsable'
WHERE role = 'commercial';

-- Vérification après migration
DO $$
DECLARE
    admin_count INTEGER;
    responsable_count INTEGER;
    technico_count INTEGER;
    null_count INTEGER;
    commercial_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count FROM public.profiles WHERE role = 'admin';
    SELECT COUNT(*) INTO responsable_count FROM public.profiles WHERE role = 'responsable';
    SELECT COUNT(*) INTO technico_count FROM public.profiles WHERE role = 'technico_commercial';
    SELECT COUNT(*) INTO null_count FROM public.profiles WHERE role IS NULL;
    SELECT COUNT(*) INTO commercial_count FROM public.profiles WHERE role = 'commercial';

    RAISE NOTICE 'Migration des données terminée:';
    RAISE NOTICE '  - admin: % utilisateurs', admin_count;
    RAISE NOTICE '  - responsable: % utilisateurs', responsable_count;
    RAISE NOTICE '  - technico_commercial: % utilisateurs', technico_count;
    RAISE NOTICE '  - NULL restants: % (devrait être 0)', null_count;
    RAISE NOTICE '  - commercial restants: % (devrait être 0)', commercial_count;

    IF null_count > 0 OR commercial_count > 0 THEN
        RAISE EXCEPTION 'Migration incomplète: des valeurs NULL ou commercial existent encore';
    END IF;
END $$;

-- ============================================================================
-- ÉTAPE 3: Ajouter la nouvelle contrainte CHECK
-- ============================================================================

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('admin', 'responsable', 'technico_commercial'));

-- Rendre la colonne NOT NULL maintenant que tous les NULL sont migrés
ALTER TABLE public.profiles
ALTER COLUMN role SET NOT NULL;

-- ============================================================================
-- ÉTAPE 4: Mettre à jour les commentaires
-- ============================================================================

COMMENT ON COLUMN public.profiles.role IS 'User role: admin (IT/system - all rights), responsable (commercial manager - full business management), technico_commercial (sales technician - read-only)';

-- ============================================================================
-- ÉTAPE 5: Mettre à jour la fonction private.can_manage_pricing()
-- ============================================================================

-- Cette fonction est utilisée dans les RLS policies pour autoriser la gestion des pricing/clients
-- Avant: admin et commercial
-- Après: admin et responsable

CREATE OR REPLACE FUNCTION private.can_manage_pricing()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'responsable')
  );
END;
$$;

COMMENT ON FUNCTION private.can_manage_pricing() IS 'Returns true if the current user is an admin or responsable (can manage pricing and clients)';

-- ============================================================================
-- ÉTAPE 6: Rapport de migration
-- ============================================================================

-- Afficher un résumé final
DO $$
DECLARE
    total_users INTEGER;
    admin_users INTEGER;
    responsable_users INTEGER;
    technico_users INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_users FROM public.profiles;
    SELECT COUNT(*) INTO admin_users FROM public.profiles WHERE role = 'admin';
    SELECT COUNT(*) INTO responsable_users FROM public.profiles WHERE role = 'responsable';
    SELECT COUNT(*) INTO technico_users FROM public.profiles WHERE role = 'technico_commercial';

    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION COMPLÈTE: Refonte des rôles';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total utilisateurs: %', total_users;
    RAISE NOTICE '  - admin: %', admin_users;
    RAISE NOTICE '  - responsable: %', responsable_users;
    RAISE NOTICE '  - technico_commercial: %', technico_users;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Contrainte CHECK: role IN (admin, responsable, technico_commercial)';
    RAISE NOTICE 'Colonne role: NOT NULL (obligatoire)';
    RAISE NOTICE 'Fonction can_manage_pricing(): admin + responsable';
    RAISE NOTICE '========================================';
END $$;
