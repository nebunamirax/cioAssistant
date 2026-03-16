# CIO Assistant

Application web locale (MVP mono-utilisateur) pour piloter actions, projets, contrats, budget et communications templatisées avec une interface de type workbench, enrichie par un assistant conversationnel capable de comprendre le langage naturel, d'agir sur les modules métier et de traiter texte, documents et audio.

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
- `/ai-reviews`
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
- `/settings`
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
- `GET|POST /api/meeting-notes`
- `GET|PATCH|DELETE /api/meeting-notes/[id]`
- `GET /api/emails`
- `POST /api/import/csv`
- `GET /api/export/csv`
- `GET /api/export/markdown`
- `POST /api/ai/summarize`
- `POST /api/ai/extract`
- `POST /api/ai/classify`
- `POST /api/ai/suggest-project`
- `POST /api/ai/intake`
- `POST /api/assistant/messages`
- `GET /api/integrations/outlook`
- `GET /api/integrations/notion`
- `GET /api/integrations/ai`

## Couche IA (abstraction)
- `lib/ai/types.ts`: interface `AIProvider`
- `lib/ai/providers/local-provider.ts`
- `lib/ai/providers/openai-provider.ts`
- `lib/ai/providers/compatible-provider.ts`
- `lib/ai/provider-factory.ts`
- `lib/services/ai-intake-service.ts`: planification sémantique, extraction par étape, exécution et fallback revue

## Assistant IA principal
- La page principale est un assistant de type chat, utilisable en langage naturel.
- L'utilisateur peut lui demander de créer, modifier, compléter, classer ou relier des éléments métier dans `Actions`, `Projets`, `Prestataires`, `Contrats`, `Budget`, `Communications` et, à terme, `Réunions`.
- La priorité d'usage doit rester le texte, qu'il soit:
  - saisi directement dans le chat
  - collé depuis un email ou un document
  - extrait d'un fichier `PDF` ou `DOCX`
- L'assistant accepte aujourd'hui sur la même surface:
  - texte libre
  - document (`txt`, `md`, `csv`, `json`, `eml`, `pdf`, `docx`)
- `/meetings` accepte maintenant un fichier audio ou une note vocale, transcrits avant synthèse.
- La transcription audio locale peut être branchée de trois façons:
  - moteur embarqué Node dans l’app avec `@kutalia/whisper-node-addon`
  - `whisper.cpp` via `AI_AUDIO_TRANSCRIPTION_BACKEND=whispercpp`
  - une commande locale personnalisée via `AI_AUDIO_TRANSCRIPTION_COMMAND`
  - un endpoint compatible audio local via `AI_AUDIO_TRANSCRIPTION_BASE_URL`
- Le backend convertit les documents texte en texte exploitable avant raisonnement métier.
- Le flux IA fait d'abord une planification sémantique de la demande, puis extrait les champs utiles étape par étape avant exécution si la confiance est suffisante.
- Si le routage est ambigu, la demande part en revue manuelle, avec possibilité de sélectionner un module puis de relancer une extraction ciblée des champs pour ce module.
- L'assistant doit gérer les créations multi-modules dans une seule conversation, par exemple un projet avec plusieurs actions associées.
- Le pipeline injecte aussi une shortlist de projets candidats en contexte serveur pour améliorer le rattachement d'actions ou de contrats à un projet existant.
- Les données explicites comme dates, montants, prestataires ou listes d'actions ne doivent pas être perdues même si le format d'entrée est libre.
- Les contrats doivent faire partie des cas prioritaires:
  - dépôt d'un `PDF` de contrat
  - extraction du titre, du fournisseur, des dates de début/fin, du type, du renouvellement, du montant et des échéances utiles
  - création ou préremplissage de `Contrats`, `Prestataires`, `Actions` et éventuellement `Budget`
- Un usage cible ultérieur est la transcription et la synthèse de réunions:
  - transcription depuis micro ou fichier audio
  - synthèse opérationnelle
  - extraction d'actions, décisions, risques et échéances
  - création ou préremplissage de notes de réunion et d'entrées liées
- Exemples de commandes cibles:
  - `ajoute un projet "toto" qui commence le 12/01/2026 et termine le 15/05/2026 et ajoute cette liste d'action : x, y, z`
  - `analyse ce PDF de contrat et crée le contrat, le prestataire et les actions de suivi`
  - `résume cette réunion et sors les décisions et actions`
- Le provider peut être `openai` ou `compatible`, avec sélection explicite du modèle via variables d’environnement ou paramètres UI.
- Les paramètres applicatifs restent modifiables depuis l’UI unifiée `/settings`, avec persistance locale dans un fichier JSON.
- Le défaut applicatif cible LM Studio en mode OpenAI-compatible: `http://host.docker.internal:1234/v1` avec `mistralai/devstral-small-2507`.
- Les réponses du chat reviennent aujourd'hui avec une sémantique conversationnelle stable via `POST /api/assistant/messages`, incluant message utilisateur, message assistant, opérations créées et éventuelles revues.

## Démarrage
```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

## Transcription audio locale
Pour le moteur embarqué directement dans l’app, la config minimale attendue est:

```bash
AI_AUDIO_TRANSCRIPTION_BACKEND=embedded
AI_AUDIO_TRANSCRIPTION_EMBEDDED_MODEL=/chemin/vers/ggml-base.bin
AI_AUDIO_TRANSCRIPTION_EMBEDDED_THREADS=4
AI_AUDIO_TRANSCRIPTION_EMBEDDED_USE_GPU=false
```

Ce mode utilise le binding Node embarqué en priorité dans le serveur Next.
Si le fichier [`.models/ggml-base.bin`](/Users/nebunamirax/Documents/Dev/cioAssistant/.models/ggml-base.bin) existe, il est detecte automatiquement sans variable supplementaire.

Pour `whisper.cpp`, la config minimale attendue est:

```bash
AI_AUDIO_TRANSCRIPTION_BACKEND=whispercpp
AI_AUDIO_TRANSCRIPTION_WHISPER_CPP_BIN=/chemin/vers/whisper-cli
AI_AUDIO_TRANSCRIPTION_WHISPER_CPP_MODEL=/chemin/vers/ggml-base.bin
AI_AUDIO_TRANSCRIPTION_WHISPER_CPP_THREADS=4
```

Le flux `/meetings` utilisera alors `whisper.cpp` avant tout fallback compatible.

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
