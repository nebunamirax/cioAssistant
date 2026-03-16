# Features Status

| Module | Description | Statut | Dépendances |
|---|---|---|---|
| Dashboard | Assistant conversationnel principal: chat opérateur, priorité texte + PDF, actions multi-modules, ingestion document; audio global encore à livrer | in progress | Prisma, IA, transcription |
| Réunions | Workbench CRUD, synthèse assistée, extraction d’actions avec responsables, création d’actions, import audio et note vocale avec transcription dans le brut | in progress | Prisma, IA, transcription |
| Actions | CRUD complet, filtres statut/priorité/retard, workbench dense liste + édition + contexte, suppression | implemented | Prisma, Zod |
| Projets | CRUD complet, filtres de base, workbench dense liste + édition + liens métier | implemented | Prisma, Zod |
| Réunions | Workbench notes de réunion livré: saisie brute + génération de synthèse avant sauvegarde; prochaine étape: création d’actions depuis CR avec responsables explicites et traçabilité vers la réunion | in progress | Prisma, IA, transcription |
| Prestataires | CRUD complet, filtres de base, workbench dense liste + édition + synthèse fournisseur | implemented | Prisma, Zod |
| Contrats | CRUD complet, filtres statut/renouvellement/échéance, workbench dense liste + édition + synthèse contractuelle | implemented | Prisma, Zod |
| Budget | CRUD lignes budgétaires, filtres de base, workbench dense liste + édition + rattachements métier + synthèse d'écart | implemented | Prisma, CSV |
| Communications | Brouillons + export + templates de communication à inputs structurés + workbench dense liste + rédaction + synthèse | implemented | Prisma |
| Mobile | Support smartphone via responsive web prioritaire, adaptation des workbenches desktop, PWA légère en second temps; application native exclue du MVP | planned | Next.js, Tailwind, UX |
| Outlook | Intégration Microsoft Graph | planned | OAuth Microsoft |
| Notion | Import/export optionnel | planned | Notion API |
| IA transverse | Assistant de chat, planner sémantique, routage multi-modules, extraction ciblée par module, revue manuelle assistée, shortlist projet en contexte, priorité texte/PDF contrats | in progress | Provider IA, Prisma |
