/*
  # Extension de la table brand_category_mappings

  1. Nouvelles colonnes
    - `version` (integer, numéro de version incrémenté à chaque modification)
    - `batch_id` (uuid, référence vers import_batches)
    - `created_by` (uuid, référence vers auth.users)
    - `source_type` (text, type de source avec contrainte CHECK)

  2. Contraintes
    - Clés étrangères vers import_batches et auth.users
    - Contrainte CHECK pour source_type

  3. Mise à jour des données existantes
    - Définir des valeurs par défaut pour les données existantes
*/

-- Ajouter les nouvelles colonnes à brand_category_mappings
ALTER TABLE brand_category_mappings 
ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

ALTER TABLE brand_category_mappings 
ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES import_batches(id) ON DELETE SET NULL;

ALTER TABLE brand_category_mappings 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE brand_category_mappings 
ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'initial_load';

-- Ajouter contrainte CHECK pour source_type
ALTER TABLE brand_category_mappings 
ADD CONSTRAINT brand_category_mappings_source_type_check 
CHECK (source_type IN ('excel_upload', 'manual_edit', 'api_import', 'initial_load'));

-- Créer des index pour les performances
CREATE INDEX IF NOT EXISTS idx_brand_category_mappings_batch_id ON brand_category_mappings(batch_id);
CREATE INDEX IF NOT EXISTS idx_brand_category_mappings_created_by ON brand_category_mappings(created_by);
CREATE INDEX IF NOT EXISTS idx_brand_category_mappings_source_type ON brand_category_mappings(source_type);
CREATE INDEX IF NOT EXISTS idx_brand_category_mappings_version ON brand_category_mappings(version);

-- Mettre à jour les données existantes pour définir created_by
-- (Nous utiliserons un utilisateur système ou le premier admin trouvé)
DO $$
DECLARE
    first_admin_id uuid;
BEGIN
    -- Trouver le premier admin ou utilisateur disponible
    SELECT id INTO first_admin_id 
    FROM profiles 
    WHERE role = 'admin' 
    LIMIT 1;
    
    -- Si aucun admin trouvé, utiliser le premier utilisateur
    IF first_admin_id IS NULL THEN
        SELECT id INTO first_admin_id 
        FROM auth.users 
        LIMIT 1;
    END IF;
    
    -- Mettre à jour les enregistrements existants
    IF first_admin_id IS NOT NULL THEN
        UPDATE brand_category_mappings 
        SET created_by = first_admin_id 
        WHERE created_by IS NULL;
    END IF;
END $$;

-- Maintenant rendre created_by NOT NULL
ALTER TABLE brand_category_mappings 
ALTER COLUMN created_by SET NOT NULL;