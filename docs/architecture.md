# Architecture

## Structure Next.js
- App Router avec pages par module métier.
- API Routes sous `app/api`.
- Layout racine avec sidebar pour la navigation.
- Les modules principaux privilégient un affichage dense de type workbench: entête de synthèse, filtres, table de navigation, panneau d'édition et panneau de contexte sur la même page.
- La page `/` est désormais un assistant conversationnel unique, servant d'entrée transverse aux modules métier.

## Séparation UI / API / services
- UI: `app/*` + `components/*`.
- API: `app/api/*`.
- Services: `lib/services/*` pour orchestration métier.
- Accès base: `lib/db/prisma.ts`.
- Les formulaires embarqués dans les panneaux suivent une structure commune: sections métier, aides courtes de saisie et zone d'action finale explicite.
- Les formulaires embarqués doivent aussi resynchroniser leur état local quand l'entrée sélectionnée change, afin que les champs préremplis reflètent toujours la donnée courante.

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

## Flux assistant conversationnel
1. L'utilisateur envoie un message texte ou un document.
2. Le backend convertit l'entrée en texte exploitable.
3. Le service d'ingestion IA planifie la demande de façon sémantique en une ou plusieurs étapes.
4. Chaque étape est extraite séparément, puis les dépendances simples sont résolues, par exemple une action liée au projet créé dans la même demande.
5. Si le niveau de confiance est suffisant, les opérations métier sont exécutées.
6. Sinon, la demande va en revue manuelle, avec possibilité de second call IA ciblé après choix du module.
7. Le chat retourne un compte-rendu lisible: actions effectuées, brouillons créés, ambiguïtés restantes.

## Cas d'usage de référence
- Texte direct:
  - commande naturelle pour créer un projet, une ou plusieurs actions, un budget ou une communication.
- PDF contrat:
  - upload d'un contrat fournisseur
  - OCR/extraction texte si nécessaire
  - extraction contractuelle structurée
  - création multi-modules ou revue assistée
- Réunion:
  - micro ou fichier audio
  - transcription
  - synthèse
  - extraction des actions et décisions
  - état actuel: cas cible non encore implémenté

## Paramètres applicatifs
- Les paramètres UI sont regroupés dans `/settings`.
- Les réglages persistants non métier sont stockés localement dans un fichier JSON applicatif.
- La configuration IA runtime fusionne d’abord les réglages persistés, puis les variables d’environnement comme fallback.

## Module Actions
- Liste serveur avec filtres `search`, `status`, `priority` et `overdueOnly`.
- `/actions` fonctionne comme un cockpit opérationnel: liste, édition et contexte cohabitent pour limiter la navigation.
- Détail d'action sur `/actions/[id]` avec édition via `PATCH /api/actions/[id]`.
- Suppression via `DELETE /api/actions/[id]`.
- Le service `lib/services/action-service.ts` centralise la normalisation des champs optionnels et la gestion de `completedAt`.

## Module Projets
- Liste serveur avec filtres `search`, `type`, `status` et `priority`.
- `/projects` fonctionne comme un cockpit portefeuille: table projet, édition et liens métier sont regroupés sur une seule surface.
- Détail projet sur `/projects/[id]` avec édition via `PATCH /api/projects/[id]`.
- Suppression via `DELETE /api/projects/[id]`.
- Le service `lib/services/project-service.ts` centralise les filtres, la normalisation des champs optionnels et le chargement des relations métier principales.

## Module Contrats
- Liste serveur avec filtres `search`, `status`, `renewalType` et `expiringOnly`.
- `/contracts` conserve le contexte contractuel complet dans la même vue avec un panneau de synthèse latéral.
- Détail contrat sur `/contracts/[id]` avec édition via `PATCH /api/contracts/[id]`.
- Suppression via `DELETE /api/contracts/[id]`.
- Le service `lib/services/contract-service.ts` centralise les échéances de contrat, la normalisation des champs optionnels et le chargement des relations principales.

## Module Prestataires
- Liste serveur avec filtres `search` et `category`.
- `/vendors` concentre recherche, annuaire, édition et synthèse fournisseur dans un même workbench.
- Détail prestataire sur `/vendors/[id]` avec édition via `PATCH /api/vendors/[id]`.
- Suppression via `DELETE /api/vendors/[id]`.
- Le service `lib/services/vendor-service.ts` centralise la normalisation des contacts et le chargement des contrats/actions/services liés.

## Module Budget
- Liste serveur avec filtres `search`, `category` et `fiscalYear`.
- `/budget` permet de comparer les lignes, ajuster les montants et lire l'écart sans quitter la vue principale.
- Détail d'une ligne budgétaire sur `/budget/[id]` avec édition via `PATCH /api/budget-items/[id]`.
- Suppression via `DELETE /api/budget-items/[id]`.
- Le service `lib/services/budget-item-service.ts` centralise les montants budgétaires, les rattachements projet/contrat/prestataire et la normalisation des champs optionnels.

## Module Communications
- Liste serveur avec filtres `search`, `status`, `type`, `projectId`, `actionId` et `contractId`.
- `/communications` réunit portefeuille, rédaction, génération par template et export dans un workbench éditorial unique.
- Détail de communication sur `/communications/[id]` avec édition via `PATCH /api/communications/[id]`.
- Suppression via `DELETE /api/communications/[id]`.
- Export Markdown unitaire ou global via `GET /api/export/markdown`.
- Templates métiers disponibles: post mortem, synthèse d'avancement projet, suivi codir.
- Le service `lib/services/communication-service.ts` centralise les filtres, les rattachements projet/action/contrat, la persistance des inputs structurés et la génération automatique du contenu.

## Module Réunions
- Liste serveur avec filtres `search` et `projectId`.
- `/meetings` fonctionne comme un workbench de compte-rendu: liste, édition et contexte cohabitent sur le même écran.
- Le formulaire structure titre, date, projet, participants, brut, synthèse et listes extraites.
- Le service `lib/services/meeting-note-service.ts` centralise les filtres, la sérialisation JSON des listes et la restitution d’un format exploitable côté UI.
- L’audio et la transcription restent un lot ultérieur, mais le module métier récepteur existe désormais.

## Validation et exécution
- L'environnement de vérification cible passe par Docker Compose.
- `docker compose run --rm test` lance Vitest dans le conteneur.
- `docker compose run --rm verify` lance la séquence complète tests + Prisma + lint + build.

## Stratégie IA
- Interface fournisseur unique (`AIProvider`).
- Choix runtime entre provider API OpenAI et provider compatible OpenAI-like.
- Le rôle d'orchestrateur est actuellement porté par `lib/services/ai-intake-service.ts`.
- Le pipeline gère:
  - planification sémantique de la demande
  - routage multi-modules
  - extraction ciblée par étape
  - shortlist projet injectée en contexte
  - revue manuelle assistée
- La transcription / synthèse audio reste un axe futur.

## Stratégie Outlook
- Connecteur isolé sous `app/api/integrations/outlook/*`.
- Fonctionnement applicatif intact sans authentification Microsoft.

## Stratégie Notion
- Connecteur isolé sous `app/api/integrations/notion/*`.
- Dépendance non bloquante pour les modules cœur.
