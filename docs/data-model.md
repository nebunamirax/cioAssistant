# Data Model

## Entités principales
- User
- Project
- Action
- Vendor
- Contract
- SupportService
- BudgetItem
- Communication
- MeetingNote
- Email
- AIJob
- Note

## Relations clés
- `Project` 1..n `Action`.
- `Vendor` 1..n `Contract`.
- `Project` 1..n `Contract` (optionnel).
- `Project`, `Vendor`, `Contract` liés à `BudgetItem` (optionnel).
- `MeetingNote` lié à `Project` (optionnel).
- `Communication` lié à `Project`, `Action`, `Contract` (optionnel).

## Focus Communication
- `Communication.templateKey` identifie un modèle de communication métier.
- `Communication.inputDataJson` stocke les inputs saisis pour générer le contenu.
- Le contenu généré reste modifiable manuellement après génération.

## Contraintes
- Un contrat doit avoir un `vendorId`.
- Une action peut exister sans projet.
- Les intégrations externes restent optionnelles.

## Conventions de nommage
- Modèles Prisma en PascalCase.
- Champs camelCase.
- Enum pour statuts, priorités et types.

## Évolution / migrations
- Ajouter champs avec defaults compatibles.
- Documenter tout changement de relation.
- Créer migration Prisma dédiée à chaque itération significative.
