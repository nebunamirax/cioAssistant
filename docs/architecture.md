# Architecture

## Structure Next.js
- App Router avec pages par module métier.
- API Routes sous `app/api`.
- Layout racine avec sidebar pour la navigation.

## Séparation UI / API / services
- UI: `app/*` + `components/*`.
- API: `app/api/*`.
- Services: `lib/services/*` pour orchestration métier.
- Accès base: `lib/db/prisma.ts`.

## Organisation des dossiers
- Un dossier par module métier.
- Validation centralisée Zod.
- Providers IA séparés par implémentation.

## Flux de données
1. UI soumet un formulaire.
2. API route valide via Zod.
3. Service métier applique les règles.
4. Service persiste via Prisma.
5. API retourne JSON normalisé.

## Module Actions
- Liste serveur avec filtres `search`, `status`, `priority` et `overdueOnly`.
- Détail d'action sur `/actions/[id]` avec édition via `PATCH /api/actions/[id]`.
- Suppression via `DELETE /api/actions/[id]`.
- Le service `lib/services/action-service.ts` centralise la normalisation des champs optionnels et la gestion de `completedAt`.

## Validation et exécution
- L'environnement de vérification cible passe par Docker Compose.
- `docker compose run --rm test` lance Vitest dans le conteneur.
- `docker compose run --rm verify` lance la séquence complète tests + Prisma + lint + build.

## Stratégie IA
- Interface fournisseur unique (`AIProvider`).
- Choix runtime entre local et API externe.
- Résultats IA proposés comme suggestions manuelles.

## Stratégie Outlook
- Connecteur isolé sous `app/api/integrations/outlook/*`.
- Fonctionnement applicatif intact sans authentification Microsoft.

## Stratégie Notion
- Connecteur isolé sous `app/api/integrations/notion/*`.
- Dépendance non bloquante pour les modules cœur.
