/*
  # Création de la table brand_mapping_history

  1. Nouvelle table
    - `brand_mapping_history`
      - `history_id` (uuid, primary key)
      - `mapping_id` (uuid, référence vers brand_category_mappings)
      - `old_data` (jsonb, état avant modification)
      - `new_data` (jsonb, état après modification)
      - `change_type` (text, type de changement avec contrainte CHECK)
      - `changed_at` (timestamptz, date/heure du changement)
      - `changed_by` (uuid, référence vers auth.users)
      - `batch_id` (uuid, référence vers import_batches si applicable)
      - `reason` (text, raison du changement)

  2. Sécurité
    - Enable RLS sur la table `brand_mapping_history`
    - Politique pour que les utilisateurs authentifiés lisent l'historique
    - Politique pour que seuls les triggers/fonctions système écrivent
*/

-- Créer la table brand_mapping_history
CREATE TABLE IF NOT EXISTS brand_mapping_history (
  history_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mapping_id uuid NOT NULL,
  old_data jsonb,
  new_data jsonb,
  change_type text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES import_batches(id) ON DELETE SET NULL,
  reason text NOT NULL DEFAULT 'Manual Edit'
);

-- Ajouter contrainte CHECK pour le type de changement
ALTER TABLE brand_mapping_history 
ADD CONSTRAINT brand_mapping_history_change_type_check 
CHECK (change_type IN ('INSERT', 'UPDATE', 'DELETE'));

-- Créer des index pour les performances
CREATE INDEX IF NOT EXISTS idx_brand_mapping_history_mapping_id ON brand_mapping_history(mapping_id);
CREATE INDEX IF NOT EXISTS idx_brand_mapping_history_changed_by ON brand_mapping_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_brand_mapping_history_batch_id ON brand_mapping_history(batch_id);
CREATE INDEX IF NOT EXISTS idx_brand_mapping_history_changed_at ON brand_mapping_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_mapping_history_change_type ON brand_mapping_history(change_type);

-- Activer RLS
ALTER TABLE brand_mapping_history ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs authentifiés lisent l'historique
CREATE POLICY "Authenticated users can read mapping history"
  ON brand_mapping_history
  FOR SELECT
  TO authenticated
  USING (true);

-- Politique pour que seuls les triggers/fonctions système écrivent dans l'historique
-- (Nous créerons une fonction spéciale pour cela)
CREATE POLICY "Only system can write to mapping history"
  ON brand_mapping_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Seuls les triggers ou fonctions système peuvent écrire
    -- Nous utiliserons une variable de session pour identifier les opérations système
    current_setting('app.writing_to_history', true) = 'true'
  );