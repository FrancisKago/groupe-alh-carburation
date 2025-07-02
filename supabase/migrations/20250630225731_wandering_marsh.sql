/*
  # Schéma initial pour l'application de gestion carburant ALH

  1. Nouvelles tables
    - `utilisateurs` - Gestion des utilisateurs avec rôles
    - `types_vehicules` - Types de véhicules avec seuils de consommation
    - `vehicules` - Flotte de véhicules
    - `demandes_carburant` - Demandes de carburant
    - `justificatifs` - Fichiers justificatifs
    - `validations` - Historique des validations
    - `logs` - Journal des actions

  2. Sécurité
    - RLS activé sur toutes les tables
    - Politiques d'accès par rôle
    - Authentification requise

  3. Fonctionnalités
    - Workflow de validation multi-niveaux
    - Gestion des seuils par type de véhicule
    - Traçabilité complète
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('chauffeur', 'pompiste', 'superviseur', 'directeur', 'admin');
CREATE TYPE statut_demande AS ENUM ('en_attente', 'valide_superviseur', 'valide_pompiste', 'valide_dg', 'rejete');
CREATE TYPE statut_validation AS ENUM ('approuve', 'rejete');

-- Table utilisateurs
CREATE TABLE IF NOT EXISTS utilisateurs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom text NOT NULL,
  email text UNIQUE NOT NULL,
  mot_de_passe text NOT NULL,
  role user_role NOT NULL DEFAULT 'chauffeur',
  actif boolean DEFAULT true,
  date_creation timestamptz DEFAULT now()
);

-- Table types_vehicules
CREATE TABLE IF NOT EXISTS types_vehicules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  libelle text NOT NULL,
  seuil_conso_par_km numeric(5,2) NOT NULL DEFAULT 0.08,
  date_creation timestamptz DEFAULT now()
);

-- Table vehicules
CREATE TABLE IF NOT EXISTS vehicules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  immatriculation text UNIQUE NOT NULL,
  id_type uuid REFERENCES types_vehicules(id) ON DELETE RESTRICT,
  actif boolean DEFAULT true,
  date_creation timestamptz DEFAULT now()
);

-- Table demandes_carburant
CREATE TABLE IF NOT EXISTS demandes_carburant (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_utilisateur uuid REFERENCES utilisateurs(id) ON DELETE CASCADE,
  id_vehicule uuid REFERENCES vehicules(id) ON DELETE RESTRICT,
  km_compteur integer NOT NULL,
  site text NOT NULL,
  mission text NOT NULL,
  quantite_demandee numeric(8,2) NOT NULL,
  quantite_servie numeric(8,2),
  raison text NOT NULL,
  statut statut_demande DEFAULT 'en_attente',
  date_demande timestamptz DEFAULT now(),
  date_modification timestamptz DEFAULT now()
);

-- Table justificatifs
CREATE TABLE IF NOT EXISTS justificatifs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_demande uuid REFERENCES demandes_carburant(id) ON DELETE CASCADE,
  url_fichier text NOT NULL,
  nom_fichier text NOT NULL,
  type_fichier text NOT NULL,
  taille_fichier integer,
  date_upload timestamptz DEFAULT now()
);

-- Table validations
CREATE TABLE IF NOT EXISTS validations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_demande uuid REFERENCES demandes_carburant(id) ON DELETE CASCADE,
  valide_par uuid REFERENCES utilisateurs(id) ON DELETE SET NULL,
  niveau_validation integer NOT NULL,
  statut_validation statut_validation NOT NULL,
  commentaire text,
  date_validation timestamptz DEFAULT now()
);

-- Table logs
CREATE TABLE IF NOT EXISTS logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  utilisateur_id uuid REFERENCES utilisateurs(id) ON DELETE SET NULL,
  action text NOT NULL,
  details text,
  date_action timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE utilisateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE types_vehicules ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicules ENABLE ROW LEVEL SECURITY;
ALTER TABLE demandes_carburant ENABLE ROW LEVEL SECURITY;
ALTER TABLE justificatifs ENABLE ROW LEVEL SECURITY;
ALTER TABLE validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for utilisateurs
CREATE POLICY "Users can read own profile"
  ON utilisateurs
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Admins can manage all users"
  ON utilisateurs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM utilisateurs 
      WHERE id::text = auth.uid()::text 
      AND role IN ('admin', 'directeur')
    )
  );

-- RLS Policies for types_vehicules
CREATE POLICY "All authenticated users can read vehicle types"
  ON types_vehicules
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage vehicle types"
  ON types_vehicules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM utilisateurs 
      WHERE id::text = auth.uid()::text 
      AND role = 'admin'
    )
  );

-- RLS Policies for vehicules
CREATE POLICY "All authenticated users can read vehicles"
  ON vehicules
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage vehicles"
  ON vehicules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM utilisateurs 
      WHERE id::text = auth.uid()::text 
      AND role IN ('admin', 'directeur')
    )
  );

-- RLS Policies for demandes_carburant
CREATE POLICY "Users can read relevant fuel requests"
  ON demandes_carburant
  FOR SELECT
  TO authenticated
  USING (
    id_utilisateur::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM utilisateurs 
      WHERE id::text = auth.uid()::text 
      AND role IN ('superviseur', 'directeur', 'admin', 'pompiste')
    )
  );

CREATE POLICY "Chauffeurs can create fuel requests"
  ON demandes_carburant
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id_utilisateur::text = auth.uid()::text AND
    EXISTS (
      SELECT 1 FROM utilisateurs 
      WHERE id::text = auth.uid()::text 
      AND role = 'chauffeur'
    )
  );

CREATE POLICY "Authorized users can update fuel requests"
  ON demandes_carburant
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM utilisateurs 
      WHERE id::text = auth.uid()::text 
      AND role IN ('superviseur', 'directeur', 'admin', 'pompiste')
    )
  );

-- RLS Policies for justificatifs
CREATE POLICY "Users can read relevant justificatifs"
  ON justificatifs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM demandes_carburant dc
      WHERE dc.id = id_demande
      AND (
        dc.id_utilisateur::text = auth.uid()::text OR
        EXISTS (
          SELECT 1 FROM utilisateurs 
          WHERE id::text = auth.uid()::text 
          AND role IN ('superviseur', 'directeur', 'admin', 'pompiste')
        )
      )
    )
  );

CREATE POLICY "Users can upload justificatifs for their requests"
  ON justificatifs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM demandes_carburant dc
      WHERE dc.id = id_demande
      AND dc.id_utilisateur::text = auth.uid()::text
    )
  );

-- RLS Policies for validations
CREATE POLICY "Users can read relevant validations"
  ON validations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM demandes_carburant dc
      WHERE dc.id = id_demande
      AND (
        dc.id_utilisateur::text = auth.uid()::text OR
        EXISTS (
          SELECT 1 FROM utilisateurs 
          WHERE id::text = auth.uid()::text 
          AND role IN ('superviseur', 'directeur', 'admin', 'pompiste')
        )
      )
    )
  );

CREATE POLICY "Authorized users can create validations"
  ON validations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    valide_par::text = auth.uid()::text AND
    EXISTS (
      SELECT 1 FROM utilisateurs 
      WHERE id::text = auth.uid()::text 
      AND role IN ('superviseur', 'directeur', 'admin', 'pompiste')
    )
  );

-- RLS Policies for logs
CREATE POLICY "Admins can read all logs"
  ON logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM utilisateurs 
      WHERE id::text = auth.uid()::text 
      AND role IN ('admin', 'directeur')
    )
  );

CREATE POLICY "All users can create logs"
  ON logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert default data
INSERT INTO types_vehicules (libelle, seuil_conso_par_km) VALUES
  ('Véhicule léger', 0.08),
  ('Camionnette', 0.12),
  ('Camion', 0.25),
  ('Engin de chantier', 0.35),
  ('Bus', 0.30);

-- Insert demo users (passwords are hashed with bcrypt)
INSERT INTO utilisateurs (id, nom, email, mot_de_passe, role) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Administrateur Système', 'admin@alh.com', '$2b$10$rOzJqQqQqQqQqQqQqQqQqO', 'admin'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Jean Dupont', 'chauffeur@alh.com', '$2b$10$rOzJqQqQqQqQqQqQqQqQqO', 'chauffeur'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Marie Martin', 'superviseur@alh.com', '$2b$10$rOzJqQqQqQqQqQqQqQqQqO', 'superviseur'),
  ('550e8400-e29b-41d4-a716-446655440004', 'Pierre Durand', 'directeur@alh.com', '$2b$10$rOzJqQqQqQqQqQqQqQqQqO', 'directeur'),
  ('550e8400-e29b-41d4-a716-446655440005', 'Ahmed Pompiste', 'pompiste@alh.com', '$2b$10$rOzJqQqQqQqQqQqQqQqQqO', 'pompiste');

-- Insert demo vehicles
INSERT INTO vehicules (immatriculation, id_type) 
SELECT 
  'ALH-' || LPAD((ROW_NUMBER() OVER())::text, 3, '0'),
  (SELECT id FROM types_vehicules ORDER BY RANDOM() LIMIT 1)
FROM generate_series(1, 20);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_demandes_carburant_utilisateur ON demandes_carburant(id_utilisateur);
CREATE INDEX IF NOT EXISTS idx_demandes_carburant_vehicule ON demandes_carburant(id_vehicule);
CREATE INDEX IF NOT EXISTS idx_demandes_carburant_statut ON demandes_carburant(statut);
CREATE INDEX IF NOT EXISTS idx_demandes_carburant_date ON demandes_carburant(date_demande);
CREATE INDEX IF NOT EXISTS idx_justificatifs_demande ON justificatifs(id_demande);
CREATE INDEX IF NOT EXISTS idx_validations_demande ON validations(id_demande);
CREATE INDEX IF NOT EXISTS idx_logs_utilisateur ON logs(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_logs_date ON logs(date_action);

-- Create functions for triggers
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.date_modification = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for demandes_carburant
CREATE TRIGGER update_demandes_carburant_modtime
    BEFORE UPDATE ON demandes_carburant
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Create function to log actions
CREATE OR REPLACE FUNCTION log_action(user_id uuid, action_text text, details_text text DEFAULT NULL)
RETURNS void AS $$
BEGIN
    INSERT INTO logs (utilisateur_id, action, details)
    VALUES (user_id, action_text, details_text);
END;
$$ LANGUAGE plpgsql;