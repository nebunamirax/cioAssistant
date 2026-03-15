# CIO Assistant

Application web locale (MVP mono-utilisateur) pour piloter actions, projets, contrats, budget et communications templatisées avec une interface de type workbench: dense, contextuelle et conçue pour éditer sans changer d'écran.

## Stack
- Next.js App Router + TypeScript
- Prisma + SQLite
- Tailwind CSS
- Zod

## Arborescence recommandée

```txt
app/
  api/
    actions/
    projects/
    vendors/
    contracts/
    support-services/
    budget-items/
    communications/
    meeting-notes/
    emails/
    import/csv/
    export/csv/
    export/markdown/
    ai/{summarize,extract,classify,suggest-project}/
    integrations/{outlook,notion,ai}/
  actions/
  projects/
  contracts/
  vendors/
  budget/
  communications/
  meetings/
  emails/
  settings/{integrations,ai}/
components/
  layout/
  actions/
  ui/
lib/
  db/
  services/
  validation/
  ai/{providers,tasks}/
prisma/
docs/
```

## Routes App Router
- `/`
- `/actions`
- `/actions/[id]`
- `/projects`
- `/projects/[id]`
- `/contracts`
- `/contracts/[id]`
- `/vendors`
- `/vendors/[id]`
- `/budget`
- `/budget/[id]`
- `/communications`
- `/communications/[id]`
- `/meetings`
- `/emails`
- `/settings/integrations`
- `/settings/ai`

## Besoin UX
- Les modules coeur (`Actions`, `Projets`, `Contrats`, `Prestataires`, `Budget`, `Communications`) doivent fonctionner comme des postes de pilotage compacts.
- La liste, les filtres, l'édition et le contexte métier doivent cohabiter sur une même page chaque fois que possible.
- Les pages détail restent disponibles comme fallback, mais le parcours principal ne doit pas imposer des allers-retours entre index et détail.
- La densité visuelle doit privilégier la vitesse de lecture et de décision, pas l'effet carte par carte.
- Les formulaires d'édition doivent être découpés par sections métier compréhensibles, avec une hiérarchie claire entre champs essentiels, champs de pilotage et champs optionnels.
- En mode édition, les champs doivent être préremplis avec les données de l'entrée sélectionnée, sans répéter inutilement ces valeurs dans l'entête du panneau.

## Endpoints API
- `GET|POST /api/actions`
- `GET|PATCH|DELETE /api/actions/[id]`
- `GET|POST /api/projects`
- `GET|PATCH|DELETE /api/projects/[id]`
- `GET|POST /api/vendors`
- `GET|PATCH|DELETE /api/vendors/[id]`
- `GET|POST /api/contracts`
- `GET|PATCH|DELETE /api/contracts/[id]`
- `GET /api/support-services`
- `GET|POST /api/budget-items`
- `GET|PATCH|DELETE /api/budget-items/[id]`
- `GET|POST /api/communications`
- `GET|PATCH|DELETE /api/communications/[id]`
- `GET /api/meeting-notes`
- `GET /api/emails`
- `POST /api/import/csv`
- `GET /api/export/csv`
- `GET /api/export/markdown`
- `POST /api/ai/summarize`
- `POST /api/ai/extract`
- `POST /api/ai/classify`
- `POST /api/ai/suggest-project`
- `POST /api/ai/intake`
- `GET /api/integrations/outlook`
- `GET /api/integrations/notion`
- `GET /api/integrations/ai`

## Couche IA (abstraction)
- `lib/ai/types.ts`: interface `AIProvider`
- `lib/ai/providers/local-provider.ts`
- `lib/ai/providers/openai-provider.ts`
- `lib/ai/providers/compatible-provider.ts`
- `lib/ai/provider-factory.ts`

## Ingestion IA dashboard
- La page principale expose une zone de capture pour coller du texte ou charger un document texte.
- Le flux `POST /api/ai/intake` analyse le contenu puis crée directement des entrées dans le ou les bons modules (`Actions`, `Projets`, `Prestataires`, `Contrats`, `Budget`, `Communications`).
- Les liaisons connues sont appliquées automatiquement quand elles peuvent être inférées.
- En cas d’analyse pauvre, le fallback crée au minimum une action pour éviter la perte d’information.
- Les documents `PDF` et `DOCX` sont acceptés et convertis en texte côté serveur avant routage.
- Le provider peut être `local`, `openai` ou `compatible`, avec sélection explicite du modèle via variables d’environnement.
- Les paramètres applicatifs sont aussi modifiables depuis l’UI unifiée `/settings`, avec persistance locale dans un fichier JSON.

## Démarrage
```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

## Docker
Pour vérifier le projet sans installer Node sur la machine hôte :

```bash
docker compose run --rm verify
```

Pour lancer uniquement les tests :

```bash
docker compose run --rm test
```

Pour valider uniquement la feature `Actions` dans le conteneur :

```bash
docker compose run --rm --entrypoint sh test -lc "npm run test:run -- tests/action-schema.test.ts tests/action-service.test.ts"
```

Pour valider uniquement la feature `Projets` dans le conteneur :

```bash
docker compose run --rm --entrypoint sh test -lc "npm run test:run -- tests/project-schema.test.ts tests/project-service.test.ts"
```

Pour valider uniquement la feature `Contrats` dans le conteneur :

```bash
docker compose run --rm --entrypoint sh test -lc "npm run test:run -- tests/contract-schema.test.ts tests/contract-service.test.ts"
```

Pour valider uniquement la feature `Prestataires` dans le conteneur :

```bash
docker compose run --rm --entrypoint sh test -lc "npm run test:run -- tests/vendor-schema.test.ts tests/vendor-service.test.ts"
```

Pour valider uniquement la feature `Budget` dans le conteneur :

```bash
docker compose run --rm --entrypoint sh test -lc "npm run test:run -- tests/budget-item-schema.test.ts tests/budget-item-service.test.ts"
```

Pour lancer l'application localement dans Docker :

```bash
docker compose up app
```

`verify` exécute les tests, `prisma db push`, le lint et le build dans le conteneur.
`app` initialise aussi le schéma Prisma SQLite dans le conteneur avant l'exécution.
