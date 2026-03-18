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
- Une évolution prévue doit permettre de relier explicitement les actions créées depuis un `MeetingNote` à leur réunion source.

## Focus Communication
- `Communication.templateKey` identifie un modèle de communication métier.
- `Communication.inputDataJson` stocke les inputs saisis pour générer le contenu.
- Le contenu généré reste modifiable manuellement après génération.

## Focus Actions / Réunions
- Une action issue d’un compte-rendu doit pouvoir stocker un responsable explicite, distinct du simple texte de description.
- Une réunion doit pouvoir produire plusieurs actions préremplies puis créées avec traçabilité vers le `MeetingNote` source.
- Les données minimales à prévoir pour cette évolution:
  - responsable saisi ou extrait
  - référence à la réunion source
  - statut de création depuis extraction (`draft extracted`, `created`, `discarded`) si l’on veut garder la piste d’audit côté réunion

## Focus Actions / Vue Kanban
- Le besoin de vue kanban ne nécessite pas de changement de modèle pour une première itération.
- Le regroupement en colonnes repose sur `Action.status`, déjà présent et aligné avec les colonnes cibles `TODO`, `IN_PROGRESS`, `BLOCKED`, `WAITING`, `DONE`.
- Le déplacement d'une carte entre colonnes correspond à une simple mise à jour de `status`.
- Tant que l'ordre visuel dans une colonne reste dérivé du tri serveur (`dueDate`, puis `createdAt`), aucun champ supplémentaire n'est nécessaire.
- Si un ordre manuel de type Trello devient un vrai besoin produit, prévoir alors:
  - un champ `position` ou `sortKey` sur `Action`
  - une stratégie de réindexation lors d'un déplacement dans une colonne
  - potentiellement un endpoint batch pour déplacer plusieurs cartes sans incohérence transitoire

## Préparation de modèle recommandée
- `Action`:
  - ajouter un champ `ownerName` ou `assigneeName` selon la convention retenue
  - ajouter un champ `meetingNoteId` nullable si l’on choisit une relation directe action -> réunion
- `Action` pour la vue kanban:
  - ne pas ajouter de champ dédié tant que le besoin se limite à une bascule liste / kanban avec changement de statut
  - introduire `position` seulement si le tri manuel intra-colonne devient une exigence fonctionnelle validée
- `MeetingNote`:
  - soit conserver les extractions en JSON mais enrichir le format pour inclure `owner`, `dueDate`, `status`
  - soit introduire une table dédiée de type `MeetingActionDraft` si l’on veut un workflow plus robuste avant création finale
- Le choix entre JSON enrichi et table dédiée doit être tranché avant implémentation, car il conditionne les routes API, les services et la migration Prisma.

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
