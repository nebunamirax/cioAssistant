# Agent Guide

## Description du projet
Application web locale de pilotage personnel pour DSI de PME (mono-utilisateur) avec modules Actions, Projets, Réunions, Contrats, Prestataires, Budget, Communications et intégrations optionnelles.

## Objectifs fonctionnels
- Centraliser les actions quotidiennes.
- Relier actions, projets, contrats, fournisseurs et budget.
- Produire des communications et comptes-rendus exploitables.
- Favoriser une interface dense avec édition contextuelle sans multiplier les changements de page.
- Préparer l’architecture Outlook, Notion et IA sans les rendre bloquants.

## Conventions de code
- TypeScript strict.
- App Router Next.js.
- Validation d’entrée API via Zod.
- Services métier dans `lib/services`.
- Schémas et types partagés dans `lib/validation` et `lib/ai`.
- Nommage anglais pour le code, français accepté dans la documentation.

## Structure du projet
- `app/`: pages et API routes.
- `components/`: UI réutilisable.
- `lib/`: accès DB, validation, services métier, abstraction IA.
- `prisma/`: schéma, migrations, seed.
- `docs/`: gouvernance.

## Règles d’évolution du code
- Ajouter une fonctionnalité par module avec séparation UI/API/service.
- Éviter la logique métier directement dans les composants.
- Toute API doit avoir validation et réponses JSON cohérentes.

## Bonnes pratiques
- Gérer les erreurs avec messages explicites.
- Garder des composants simples et testables.
- Éviter les dépendances inutiles.

## Règles de modification Prisma
- Toute modification du schéma implique mise à jour de `docs/data-model.md`.
- Générer une migration explicite.
- Préserver la compatibilité des données existantes.

## Règles d’ajout API
- Route dans `app/api/<module>/route.ts`.
- Validation Zod côté serveur.
- Pas de logique d’intégration externe dans les routes: déléguer au service.

## Règles de modification UI
- Conserver une interface sobre et productive.
- Réutiliser les composants de `components/ui`.
- Éviter les animations et effets non essentiels.
