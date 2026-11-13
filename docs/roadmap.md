# Roadmap

## MVP
- Socle Next.js + Prisma + SQLite.
- Dashboard minimal.
- Modules Actions, Projets, Réunions, Prestataires/Contrats, Budget, Communications.

## Phase IA
- Remplacer la zone d’ingestion home par un assistant conversationnel complet.
- Support texte, documents, micro et fichiers audio.
- Routage multi-modules avec exécution d’actions métier.
- Revue manuelle assistée par second call IA ciblé.
- Synthèse de réunions et extraction d’actions/décisions/risques.
- Plan d'exécution détaillé: [chat-assistant-implementation-plan.md](/Users/nebunamirax/Documents/Dev/cioAssistant/docs/chat-assistant-implementation-plan.md)

## Phase mobile web
- Rendre le layout et la navigation réellement utilisables sur smartphone.
- Remplacer la sidebar fixe par un header mobile + menu ouvrable.
- Transformer les workbenches desktop en parcours mobile: liste, édition et contexte empilés ou affichés en panneau plein écran.
- Remplacer les tables trop denses par des cartes ou listes compactes sur petit écran.
- Compacter les filtres dans des zones repliables.
- Prioriser l'usage mobile du chat, de la consultation et de la saisie rapide.

## Phase PWA
- Ajouter manifest, icônes et installation sur écran d'accueil.
- Activer un mode plein écran propre à l'usage mobile.
- Prévoir un cache léger pour accélérer le chargement des assets et améliorer l'expérience d'ouverture.

## Phase Outlook
- Auth Microsoft.
- Import email et conversion vers actions.

## Suivi externe des projets

- V1 personnelle dans Docker, sur TypeScript, Next.js, Prisma et SQLite. Les éléments externes conservent leur provenance et leur identifiant, avec un suivi distinct des actions locales.
- Planner standard en lecture seule. Sélection du plan, rattachement au projet et synchronisation manuelle avec accès Microsoft Graph délégué.
- Ticketing maison par CSV UTF-8. Aperçu, association des colonnes et des statuts, puis import répétable par projet et source.
- Suivi filtrable dans la fiche projet. Retards et blocages dans le cockpit et le CODIR.
- Recette tenant à effectuer avec un plan standard réel et un export de ticketing anonymisé.

### Lots suivants

- Synchronisation planifiée, après validation du suivi sur les données réelles.
- Connecteur API du ticketing maison, après cadrage de son authentification, de son format et de sa pagination.
- Création explicite d’une tâche Planner ou d’un ticket depuis un e-mail, avec choix de la destination avant confirmation.

## Phase Notion
- Export notes/communications.
- Import pages sélectionnées.

## Phase collaboration
- Migration PostgreSQL.
- Multi-utilisateurs.
- Droits d’accès simples.

## Hors scope MVP
- Application mobile native iOS/Android.
- Publication sur stores.
- Offline métier complet avec synchronisation avancée.
