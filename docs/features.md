# Features Status

| Module | Description | Statut | Dépendances |
|---|---|---|---|
| Dashboard | Vue synthèse des priorités et alertes | implemented (minimal) | Prisma |
| Actions | CRUD complet, filtres statut/priorité/retard, édition depuis liste et fiche détail, suppression | implemented | Prisma, Zod |
| Projets | CRUD complet, filtres de base, édition depuis liste et fiche détail, aperçu des liens métier | implemented | Prisma, Zod |
| Réunions | Comptes-rendus + extraction | planned | Prisma, IA |
| Prestataires | CRUD complet, filtres de base, édition depuis liste et fiche détail, vue des liens métier | implemented | Prisma, Zod |
| Contrats | CRUD complet, filtres statut/renouvellement/échéance, édition depuis liste et fiche détail | implemented | Prisma, Zod |
| Budget | CRUD lignes budgétaires, filtres de base, édition depuis liste et fiche détail, rattachements métier et synthèse d'écart | implemented | Prisma, CSV |
| Communications | Brouillons + export + templates de communication a inputs structures + édition depuis liste et fiche détail | implemented | Prisma |
| Outlook | Intégration Microsoft Graph | planned | OAuth Microsoft |
| Notion | Import/export optionnel | planned | Notion API |
| IA transverse | Résumé, extraction, suggestion projet | partial (architecture) | Provider IA |
