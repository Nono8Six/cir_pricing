/*
  # Schema complet pour la gestion des clients CIR Pricing

  1. Nouvelles Tables
    - `groups` - Groupements de clients (ex. 'Intégrateurs', 'Agroalimentaire')
    - `clients` - Clients avec informations complètes et contacts
    - `brand_category_mappings` - Mapping des segments tarifaires pour classification CIR
    - `prices` - Prix avec historique et validité (mise à jour du schéma existant)

  2. Sécurité
    - RLS activé sur toutes les tables
    - Politiques pour admins (gestion complète) et commerciaux (lecture + prix)

  3. Évolutivité
    - Champs JSON pour contacts et historique
    - Support futur parsing IA (Gemma) avec supplier_file_format
    - Classifications CIR automatiques via colonnes calculées
*/

-- Fonction pour mise à jour automatique des timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Table des groupements
DROP TABLE IF EXISTS public.groups CASCADE;
CREATE TABLE public.groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_groups_updated_at 
    BEFORE UPDATE ON public.groups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins peuvent gérer les groupes" 
    ON public.groups FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));

CREATE POLICY "Tous peuvent lire les groupes" 
    ON public.groups FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Table des clients
DROP TABLE IF EXISTS public.clients CASCADE;
CREATE TABLE public.clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    address text,
    city text,
    zip text,
    country text DEFAULT 'France',
    siret text UNIQUE,
    cir_account_number text UNIQUE,
    group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
    agency text,
    contacts jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_clients_group ON public.clients(group_id);
CREATE INDEX idx_clients_siret ON public.clients(siret) WHERE siret IS NOT NULL;

CREATE TRIGGER update_clients_updated_at 
    BEFORE UPDATE ON public.clients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins peuvent gérer les clients" 
    ON public.clients FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));

CREATE POLICY "Tous peuvent lire les clients" 
    ON public.clients FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Table des mappings de catégories (pour classification CIR)
DROP TABLE IF EXISTS public.brand_category_mappings CASCADE;
CREATE TABLE public.brand_category_mappings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    segment text NOT NULL,
    marque text NOT NULL,
    cat_fab text NOT NULL,
    cat_fab_l text,
    strategiq integer NOT NULL DEFAULT 0 CHECK (strategiq IN (0, 1)),
    codif_fair text,
    fsmega integer NOT NULL,
    fsfam integer NOT NULL,
    fssfa integer NOT NULL,
    classif_cir text GENERATED ALWAYS AS (
        fsmega::text || ' ' || fsfam::text || ' ' || fssfa::text
    ) STORED,
    created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_brand_mapping_unique ON public.brand_category_mappings(marque, cat_fab);
CREATE INDEX idx_brand_mapping_marque ON public.brand_category_mappings(marque);
CREATE INDEX idx_brand_mapping_segment ON public.brand_category_mappings(segment);

ALTER TABLE public.brand_category_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins peuvent gérer les mappings" 
    ON public.brand_category_mappings FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));

CREATE POLICY "Tous peuvent lire les mappings" 
    ON public.brand_category_mappings FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Recréer la table des prix avec le nouveau schéma
DROP TABLE IF EXISTS public.prices CASCADE;
CREATE TABLE public.prices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    marque text NOT NULL,
    reference text NOT NULL,
    famille_fab text,
    segment_cir text,
    fsmega integer,
    fsfam integer,
    fssfa integer,
    classif_cir text GENERATED ALWAYS AS (
        CASE 
            WHEN fsmega IS NOT NULL AND fsfam IS NOT NULL AND fssfa IS NOT NULL 
            THEN fsmega::text || ' ' || fsfam::text || ' ' || fssfa::text
            ELSE NULL
        END
    ) STORED,
    purchase_price_ht numeric(12,4) NOT NULL,
    standard_tarif numeric(12,4),
    standard_remise numeric(5,2),
    deroge_remise numeric(5,2),
    deroge_price numeric(12,4),
    selling_price_ht numeric(12,4) NOT NULL,
    margin_amount numeric(12,4),
    margin_rate numeric(5,2),
    coefficient numeric(8,4),
    validity_start timestamptz,
    validity_end timestamptz,
    deroge_number text,
    is_active boolean DEFAULT true,
    history jsonb DEFAULT '[]'::jsonb,
    supplier_file_format jsonb, -- Futur: parsing IA formats hétérogènes
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_prices_client_reference ON public.prices(client_id, reference);
CREATE INDEX idx_prices_active ON public.prices(is_active) WHERE (is_active = true);
CREATE INDEX idx_prices_marque ON public.prices(marque);
CREATE INDEX idx_prices_validity ON public.prices(validity_start, validity_end);

CREATE TRIGGER update_prices_updated_at 
    BEFORE UPDATE ON public.prices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins peuvent supprimer des prix" 
    ON public.prices FOR DELETE 
    USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));

CREATE POLICY "Commerciaux peuvent créer des prix" 
    ON public.prices FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['admin', 'commercial'])
    ));

CREATE POLICY "Commerciaux peuvent modifier des prix" 
    ON public.prices FOR UPDATE 
    USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['admin', 'commercial'])
    ));

CREATE POLICY "Tous peuvent lire les prix" 
    ON public.prices FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Données de test (seed)
INSERT INTO public.groups (name) VALUES 
    ('Intégrateurs'),
    ('Agroalimentaire');

INSERT INTO public.clients (name, address, city, zip, country, siret, cir_account_number, group_id, agency, contacts) VALUES 
    (
        'ACME Industries', 
        '123 Rue de la Paix', 
        'Paris', 
        '75001', 
        'France', 
        '12345678901234', 
        'CIR001',
        (SELECT id FROM public.groups WHERE name = 'Intégrateurs'),
        'Paris',
        '[{"name": "Jean Dupont", "email": "j.dupont@acme.fr", "phone": "01.23.45.67.89"}]'::jsonb
    ),
    (
        'TechCorp Solutions', 
        '456 Avenue des Champs', 
        'Lyon', 
        '69000', 
        'France', 
        '98765432109876', 
        'CIR002',
        (SELECT id FROM public.groups WHERE name = 'Intégrateurs'),
        'Lyon',
        '[{"name": "Marie Martin", "email": "m.martin@techcorp.fr", "phone": "04.56.78.90.12"}]'::jsonb
    ),
    (
        'AgriMax', 
        '789 Boulevard Rural', 
        'Toulouse', 
        '31000', 
        'France', 
        '11223344556677', 
        'CIR003',
        (SELECT id FROM public.groups WHERE name = 'Agroalimentaire'),
        'Toulouse',
        '[{"name": "Pierre Durand", "email": "p.durand@agrimax.fr", "phone": "05.67.89.01.23"}]'::jsonb
    ),
    (
        'InnoTech', 
        '321 Rue Innovation', 
        'Marseille', 
        '13000', 
        'France', 
        '99887766554433', 
        'CIR004',
        (SELECT id FROM public.groups WHERE name = 'Intégrateurs'),
        'Marseille',
        '[]'::jsonb
    ),
    (
        'FoodPro Services', 
        '654 Allée Gustave', 
        'Nantes', 
        '44000', 
        'France', 
        '55443322110099', 
        'CIR005',
        (SELECT id FROM public.groups WHERE name = 'Agroalimentaire'),
        'Nantes',
        '[{"name": "Sophie Leroy", "email": "s.leroy@foodpro.fr", "phone": "02.34.56.78.90"}, {"name": "Luc Bernard", "email": "l.bernard@foodpro.fr", "phone": "02.34.56.78.91"}]'::jsonb
    );

-- Mappings de catégories (exemples basés sur SEGMENTS TARIFAIRES.xlsx)
INSERT INTO public.brand_category_mappings (segment, marque, cat_fab, cat_fab_l, strategiq, codif_fair, fsmega, fsfam, fssfa) VALUES 
    ('ROULEMENTS', 'SKF', 'Z16', 'Roulements à billes', 1, 'FAIR001', 1, 10, 100),
    ('ROULEMENTS', 'FAG', 'Z16', 'Roulements à rouleaux', 1, 'FAIR002', 1, 10, 101),
    ('COURROIES', 'GATES', 'C20', 'Courroies dentées', 0, 'FAIR003', 2, 20, 200),
    ('COURROIES', 'OPTIBELT', 'C20', 'Courroies trapézoïdales', 0, 'FAIR004', 2, 20, 201),
    ('PNEUMATIQUE', 'MICHELIN', 'P30', 'Pneumatiques industriels', 1, 'FAIR005', 3, 30, 300),
    ('HYDRAULIQUE', 'PARKER', 'H40', 'Composants hydrauliques', 1, 'FAIR006', 4, 40, 400),
    ('ETANCHEITE', 'FREUDENBERG', 'E50', 'Joints et étanchéité', 0, 'FAIR007', 5, 50, 500),
    ('VISSERIE', 'BOSSARD', 'V60', 'Visserie industrielle', 0, 'FAIR008', 6, 60, 600),
    ('OUTILLAGE', 'FACOM', 'O70', 'Outillage professionnel', 1, 'FAIR009', 7, 70, 700),
    ('MANUTENTION', 'YALE', 'M80', 'Équipements manutention', 1, 'FAIR010', 8, 80, 800);

-- Prix d'exemple
INSERT INTO public.prices (client_id, marque, reference, famille_fab, segment_cir, fsmega, fsfam, fssfa, purchase_price_ht, standard_tarif, standard_remise, selling_price_ht, margin_amount, margin_rate, coefficient, validity_start, validity_end, is_active) VALUES 
    (
        (SELECT id FROM public.clients WHERE name = 'ACME Industries'),
        'SKF',
        'SKF-6205-2RS',
        'Z16',
        'ROULEMENTS',
        1, 10, 100,
        25.50,
        35.00,
        15.0,
        32.50,
        7.00,
        21.54,
        1.27,
        now(),
        now() + interval '1 year',
        true
    ),
    (
        (SELECT id FROM public.clients WHERE name = 'TechCorp Solutions'),
        'GATES',
        'GATES-5M-425',
        'C20',
        'COURROIES',
        2, 20, 200,
        18.75,
        28.00,
        20.0,
        26.50,
        7.75,
        29.25,
        1.41,
        now(),
        now() + interval '6 months',
        true
    ),
    (
        (SELECT id FROM public.clients WHERE name = 'AgriMax'),
        'MICHELIN',
        'MICH-16.9R30',
        'P30',
        'PNEUMATIQUE',
        3, 30, 300,
        450.00,
        650.00,
        25.0,
        580.00,
        130.00,
        22.41,
        1.29,
        now(),
        now() + interval '2 years',
        true
    );

-- Commentaires pour évolutivité future
COMMENT ON TABLE public.prices IS 'Futur : Parsing IA Gemma pour fichiers tarif (headers variés, remises/dates), imports Excel mapping, prix par fournisseur avec validité/obsolescence';
COMMENT ON COLUMN public.prices.supplier_file_format IS 'JSON pour stocker format fichier fournisseur : {headers: [Tarif, Remise], format: Excel, parsing_rules: {...}}';
COMMENT ON TABLE public.brand_category_mappings IS 'Mapping segments SEGMENTS TARIFAIRES.xlsx pour classification automatique CIR des références produits';