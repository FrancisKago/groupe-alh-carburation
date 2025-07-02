/*
  # Migration pour corriger la structure de la table utilisateurs

  1. Modifications
    - Supprimer la colonne mot_de_passe (non nécessaire avec Supabase Auth)
    - Configurer les politiques RLS pour l'intégration avec Supabase Auth

  2. Sécurité
    - Activer RLS sur la table utilisateurs
    - Créer les politiques d'accès appropriées
*/

-- Supprimer la colonne mot_de_passe si elle existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'utilisateurs' AND column_name = 'mot_de_passe'
  ) THEN
    ALTER TABLE utilisateurs DROP COLUMN mot_de_passe;
  END IF;
END $$;

-- Enable RLS sur la table utilisateurs
ALTER TABLE utilisateurs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for utilisateurs
CREATE POLICY "Users can read own profile"
  ON utilisateurs
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can create their own profile"
  ON utilisateurs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile"
  ON utilisateurs
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

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