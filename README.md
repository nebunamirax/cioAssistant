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
- `/contracts`
- `/vendors`
- `/budget`
- `/communications`
- `/meetings`
- `/emails`
- `/settings/integrations`
- `/settings/ai`

## Endpoints API
- `GET|POST /api/actions`
- `GET /api/projects`
- `GET /api/vendors`
- `GET /api/contracts`
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
