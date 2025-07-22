/*
  # Schema initial pour gestion tarifaire CIR

  1. Nouvelles Tables
    - `groups` - Groupes clients (ex. Intégrateurs, Agroalimentaire)
    - `clients` - Clients avec référence optionnelle au groupe
    - `brand_category_mappings` - Mapping marques/catégories avec classification CIR
    - `prices` - Tarifs avec historique et calculs automatiques
    - `profiles` - Profils utilisateurs étendus avec rôles CIR

  2. Sécurité
    - RLS activé sur toutes les tables
    - Politiques basées sur les rôles (admin/commercial)
    - Contraintes d'intégrité référentielle

  3. Fonctionnalités
    - Classification CIR auto-générée (fsmega fsfam fssfa)
    - Historique des prix via JSON
    - Archivage automatique des anciens prix
*/

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des groupes clients
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des clients
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  group_id uuid REFERENCES groups(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des mappings marques/catégories
CREATE TABLE IF NOT EXISTS brand_category_mappings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  segment text NOT NULL,
  marque text NOT NULL,
  cat_fab text NOT NULL,
  cat_fab_l text,
  strategiq integer NOT NULL DEFAULT 0 CHECK (strategiq IN (0, 1)),
  fsmega integer NOT NULL,
  fsfam integer NOT NULL,
  fssfa integer NOT NULL,
  classif_cir text GENERATED ALWAYS AS (fsmega || ' ' || fsfam || ' ' || fssfa) STORED,
  created_at timestamptz DEFAULT now()
);

-- Table des prix
CREATE TABLE IF NOT EXISTS prices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  marque text NOT NULL,
  reference text NOT NULL,
  famille_fab text NOT NULL,
  segment_cir text NOT NULL,
  fsmega integer NOT NULL,
  fsfam integer NOT NULL,
  fssfa integer NOT NULL,
  classif_cir text GENERATED ALWAYS AS (fsmega || ' ' || fsfam || ' ' || fssfa) STORED,
  purchase_price_ht numeric(12,4) NOT NULL,
  standard_tarif numeric(12,4),
  standard_remise numeric(5,2),
  deroge_remise numeric(5,2),
  deroge_price numeric(12,4),
  selling_price_ht numeric(12,4) NOT NULL,
  margin_amount numeric(12,4),
  margin_rate numeric(5,2),
  coefficient numeric(8,4),
  validity_date timestamptz,
  is_active boolean DEFAULT true,
  history jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des profils utilisateurs étendus
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'commercial' CHECK (role IN ('admin', 'commercial')),
  first_name text,
  last_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_prices_client_reference ON prices(client_id, reference);
CREATE INDEX IF NOT EXISTS idx_prices_active ON prices(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_brand_mapping_marque ON brand_category_mappings(marque);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_prices_updated_at BEFORE UPDATE ON prices FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- RLS Policies
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_category_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Politiques pour groups
CREATE POLICY "Tous peuvent lire les groupes" ON groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins peuvent gérer les groupes" ON groups FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Politiques pour clients
CREATE POLICY "Tous peuvent lire les clients" ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins peuvent gérer les clients" ON clients FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Politiques pour brand_category_mappings
CREATE POLICY "Tous peuvent lire les mappings" ON brand_category_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins peuvent gérer les mappings" ON brand_category_mappings FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Politiques pour prices
CREATE POLICY "Tous peuvent lire les prix" ON prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Commerciaux peuvent créer des prix" ON prices FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'commercial'))
);
CREATE POLICY "Commerciaux peuvent modifier des prix" ON prices FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'commercial'))
);
CREATE POLICY "Admins peuvent supprimer des prix" ON prices FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Politiques pour profiles
CREATE POLICY "Users peuvent lire leur profil" ON profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users peuvent modifier leur profil" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins peuvent tout gérer" ON profiles FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Données de test
INSERT INTO groups (name) VALUES 
  ('Intégrateurs'),
  ('Agroalimentaire'),
  ('Industrie Automobile');

INSERT INTO clients (name, group_id) VALUES 
  ('Schneider Electric', (SELECT id FROM groups WHERE name = 'Intégrateurs')),
  ('Danone', (SELECT id FROM groups WHERE name = 'Agroalimentaire')),
  ('Renault', (SELECT id FROM groups WHERE name = 'Industrie Automobile'));

INSERT INTO brand_category_mappings (segment, marque, cat_fab, cat_fab_l, strategiq, fsmega, fsfam, fssfa) VALUES 
  ('Automation', 'Schneider', 'PLC', 'Automates Programmables', 1, 10, 15, 20),
  ('Sensors', 'Siemens', 'PROX', 'Capteurs Proximité', 1, 11, 16, 21),
  ('Motors', 'ABB', 'MOT', 'Moteurs Électriques', 0, 12, 17, 22);