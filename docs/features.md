# Features Status

| Module | Description | Statut | Dépendances |
|---|---|---|---|
| Dashboard | Vue synthèse des priorités et alertes | implemented (minimal) | Prisma |
| Actions | CRUD complet, filtres statut/priorité/retard, workbench dense liste + édition + contexte, suppression | implemented | Prisma, Zod |
| Projets | CRUD complet, filtres de base, workbench dense liste + édition + liens métier | implemented | Prisma, Zod |
| Réunions | Comptes-rendus + extraction | planned | Prisma, IA |
| Prestataires | CRUD complet, filtres de base, workbench dense liste + édition + synthèse fournisseur | implemented | Prisma, Zod |
| Contrats | CRUD complet, filtres statut/renouvellement/échéance, workbench dense liste + édition + synthèse contractuelle | implemented | Prisma, Zod |
| Budget | CRUD lignes budgétaires, filtres de base, workbench dense liste + édition + rattachements métier + synthèse d'écart | implemented | Prisma, CSV |
| Communications | Brouillons + export + templates de communication à inputs structurés + workbench dense liste + rédaction + synthèse | implemented | Prisma |
| Outlook | Intégration Microsoft Graph | planned | OAuth Microsoft |
| Notion | Import/export optionnel | planned | Notion API |
| IA transverse | Résumé, extraction, suggestion projet | partial (architecture) | Provider IA |
