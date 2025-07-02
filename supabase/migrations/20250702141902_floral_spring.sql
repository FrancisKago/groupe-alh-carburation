/*
  # Migration pour corriger la structure de la table utilisateurs

  1. Modifications
    - Supprimer la colonne mot_de_passe (non nécessaire avec Supabase Auth)
    - Ajouter une colonne prenom optionnelle
    - Mettre à jour les contraintes

  2. Sécurité
    - Maintenir RLS
    - Conserver les politiques existantes
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

-- Ajouter la colonne prenom si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'utilisateurs' AND column_name = 'prenom'
  ) THEN
    ALTER TABLE utilisateurs ADD COLUMN prenom text;
  END IF;
END $$;

-- Mettre à jour la politique RLS pour permettre l'insertion lors de l'inscription
DROP POLICY IF EXISTS "Users can create their own profile" ON utilisateurs;
CREATE POLICY "Users can create their own profile"
  ON utilisateurs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = id::text);

-- Politique pour permettre la mise à jour du profil utilisateur
DROP POLICY IF EXISTS "Users can update own profile" ON utilisateurs;
CREATE POLICY "Users can update own profile"
  ON utilisateurs
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);