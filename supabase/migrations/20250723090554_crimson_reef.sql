/*
  # Mise à jour des politiques RLS existantes

  1. Mise à jour des politiques sur brand_category_mappings
    - Prendre en compte les nouvelles colonnes
    - Permettre la définition de created_by lors de l'insertion

  2. Nouvelles politiques pour les fonctions d'audit
    - Permettre l'utilisation des fonctions utilitaires
*/

-- Supprimer les anciennes politiques sur brand_category_mappings si elles existent
DROP POLICY IF EXISTS "Authenticated users can delete brand mappings" ON brand_category_mappings;
DROP POLICY IF EXISTS "Authenticated users can insert brand mappings" ON brand_category_mappings;
DROP POLICY IF EXISTS "Authenticated users can read brand mappings" ON brand_category_mappings;
DROP POLICY IF EXISTS "Authenticated users can update brand mappings" ON brand_category_mappings;

-- Recréer les politiques avec prise en compte des nouvelles colonnes
CREATE POLICY "Authenticated users can read brand mappings"
  ON brand_category_mappings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert brand mappings"
  ON brand_category_mappings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- L'utilisateur peut insérer s'il définit created_by à son propre ID
    -- ou s'il est admin (peut insérer pour d'autres utilisateurs)
    created_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can update brand mappings"
  ON brand_category_mappings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (
    -- Lors de la mise à jour, created_by ne doit pas changer
    -- sauf si l'utilisateur est admin
    (created_by = OLD.created_by) OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can delete brand mappings"
  ON brand_category_mappings
  FOR DELETE
  TO authenticated
  USING (
    -- Seuls les admins peuvent supprimer
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Politique spéciale pour les admins qui peuvent tout faire
CREATE POLICY "Admins can manage all brand mappings"
  ON brand_category_mappings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );