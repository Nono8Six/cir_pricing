-- Migration: Add CHECK Constraint on profiles.role
-- Date: 2025-11-10
-- Description: Ajoute une contrainte CHECK pour garantir que seules les valeurs de rôle valides peuvent être insérées
--
-- Contexte:
-- La colonne profiles.role accepte actuellement n'importe quelle valeur texte (ou NULL).
-- Cette migration ajoute une contrainte pour garantir l'intégrité des données.
--
-- Rôles valides:
-- - 'admin' : Administrateurs (tous les droits)
-- - 'commercial' : Commerciaux (gestion pricing et clients)
-- - NULL : Viewers (lecture seule uniquement)
--
-- Cette contrainte prévient:
-- - Les typos lors de l'insertion (ex: 'admon', 'comercial')
-- - Les valeurs arbitraires invalides
-- - Les incohérences dans la logique de permissions

-- ============================================================================
-- Vérification des données existantes
-- ============================================================================

-- Cette requête vérifie si des valeurs invalides existent déjà
-- Si elle retourne des lignes, la migration échouera et il faudra corriger les données
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM public.profiles
    WHERE role IS NOT NULL
      AND role NOT IN ('admin', 'commercial');

    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Found % profiles with invalid role values. Please fix data before applying constraint.', invalid_count;
    END IF;

    RAISE NOTICE 'All existing role values are valid. Proceeding with constraint addition.';
END $$;

-- ============================================================================
-- Ajout de la contrainte CHECK
-- ============================================================================

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IS NULL OR role IN ('admin', 'commercial'));

-- ============================================================================
-- Commentaire sur la colonne
-- ============================================================================

COMMENT ON COLUMN public.profiles.role IS 'User role: admin (all rights), commercial (pricing/clients management), NULL (viewer - read-only)';

-- ============================================================================
-- Test (à exécuter manuellement après migration si besoin de vérifier)
-- ============================================================================

-- Cette requête devrait ÉCHOUER (valeur invalide) :
-- INSERT INTO public.profiles (id, email, role) VALUES (gen_random_uuid(), 'test@example.com', 'invalid_role');

-- Ces requêtes devraient RÉUSSIR (valeurs valides) :
-- INSERT INTO public.profiles (id, email, role) VALUES (gen_random_uuid(), 'admin@example.com', 'admin');
-- INSERT INTO public.profiles (id, email, role) VALUES (gen_random_uuid(), 'commercial@example.com', 'commercial');
-- INSERT INTO public.profiles (id, email, role) VALUES (gen_random_uuid(), 'viewer@example.com', NULL);
