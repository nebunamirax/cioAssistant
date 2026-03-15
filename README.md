# CIO Assistant

Application web locale (MVP mono-utilisateur) pour piloter actions, projets, contrats, budget et communications.

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
- `/communications`
- `/meetings`
- `/emails`
- `/settings/integrations`
- `/settings/ai`

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
- `GET /api/budget-items`
- `GET /api/communications`
- `GET /api/meeting-notes`
- `GET /api/emails`
- `POST /api/import/csv`
- `GET /api/export/csv`
- `GET /api/export/markdown`
- `POST /api/ai/summarize`
- `POST /api/ai/extract`
- `POST /api/ai/classify`
- `POST /api/ai/suggest-project`
- `GET /api/integrations/outlook`
- `GET /api/integrations/notion`
- `GET /api/integrations/ai`

## Couche IA (abstraction)
- `lib/ai/types.ts`: interface `AIProvider`
- `lib/ai/providers/local-provider.ts`
- `lib/ai/providers/external-provider.ts`
- `lib/ai/provider-factory.ts`

Les suggestions IA restent non bloquantes et validées manuellement.

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

Pour lancer l'application localement dans Docker :

```bash
docker compose up app
```

`verify` exécute les tests, `prisma db push`, le lint et le build dans le conteneur.
`app` initialise aussi le schéma Prisma SQLite dans le conteneur avant l'exécution.
