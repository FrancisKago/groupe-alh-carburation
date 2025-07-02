# Groupe ALH Carburation

Cette application est une interface React/TypeScript utilisant Supabase pour l'authentification et la persistance des données. Elle permet de gérer les utilisateurs, véhicules et demandes de carburant.

## Prérequis

- Node.js >= 18
- Supabase CLI (pour appliquer les migrations)

## Installation

1. Clonez le dépôt puis installez les dépendances :

```bash
npm install
```

2. Copiez le fichier `.env.example` vers `.env` et renseignez vos clés Supabase :

```bash
cp .env.example .env
# Éditez .env et ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
```

## Migrations

Les fichiers de migration se trouvent dans `supabase/migrations`. Après avoir configuré Supabase CLI, appliquez-les avec :

```bash
supabase db reset --force
```

ou toute autre commande adaptée à votre environnement.

## Scripts

- `npm run dev` : lance l'application en mode développement.
- `npm run build` : génère la version de production.
- `npm run preview` : prévisualise la build.
- `npm run lint` : exécute ESLint.

## Comptes de démonstration

Des utilisateurs de démonstration peuvent être créés via la page "Setup Demo" de l'application.

## Licence

Ce projet est distribué sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.
