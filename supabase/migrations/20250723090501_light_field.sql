/*
  # Création de la table import_batches

  1. Nouvelle table
    - `import_batches`
      - `id` (uuid, primary key)
      - `filename` (text, nom du fichier Excel)
      - `user_id` (uuid, référence vers auth.users)
      - `timestamp` (timestamptz, date/heure de l'opération)
      - `status` (text, statut du lot avec contrainte CHECK)
      - `total_lines` (integer, nombre total de lignes dans le fichier)
      - `processed_lines` (integer, nombre de lignes traitées avec succès)
      - `error_lines` (integer, nombre de lignes en erreur)
      - `warnings` (jsonb, avertissements généraux du lot)
      - `comment` (text, commentaire obligatoire pour traçabilité)

  2. Sécurité
    - Enable RLS sur la table `import_batches`
    - Politique pour que les utilisateurs voient leurs propres lots
    - Politique pour que les admins voient tous les lots
*/

-- Créer la table import_batches
CREATE TABLE IF NOT EXISTS import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  total_lines integer NOT NULL DEFAULT 0,
  processed_lines integer NOT NULL DEFAULT 0,
  error_lines integer NOT NULL DEFAULT 0,
  warnings jsonb DEFAULT '[]'::jsonb,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ajouter contrainte CHECK pour le statut
ALTER TABLE import_batches 
ADD CONSTRAINT import_batches_status_check 
CHECK (status IN ('pending', 'completed', 'failed', 'rolled_back'));

-- Créer des index pour les performances
CREATE INDEX IF NOT EXISTS idx_import_batches_user_id ON import_batches(user_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_status ON import_batches(status);
CREATE INDEX IF NOT EXISTS idx_import_batches_timestamp ON import_batches(timestamp DESC);

-- Activer RLS
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs voient leurs propres lots
CREATE POLICY "Users can read their own import batches"
  ON import_batches
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Politique pour que les utilisateurs créent leurs propres lots
CREATE POLICY "Users can create their own import batches"
  ON import_batches
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Politique pour que les utilisateurs mettent à jour leurs propres lots
CREATE POLICY "Users can update their own import batches"
  ON import_batches
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politique pour que les admins voient tous les lots
CREATE POLICY "Admins can manage all import batches"
  ON import_batches
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_import_batches_updated_at
  BEFORE UPDATE ON import_batches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();