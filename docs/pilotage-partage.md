# Pilotage DSI partagé

## Mettre à jour l’instance existante

Lancer les commandes depuis le même projet Compose que l’instance en cours pour retrouver le volume `app-data`. Conserver son nom de projet si l’instance a été lancée avec `-p`.

```sh
docker compose build app verify
docker compose run --rm verify
docker compose stop app
docker compose run --rm --no-deps app node scripts/database.mjs adopt
```

La commande d’adoption reconnaît le schéma avant toute écriture. Elle réalise une sauvegarde datée dans le volume, puis inscrit les migrations déjà présentes. Si elle signale un schéma inconnu ou des références orphelines, conserver la base et examiner l’écart. Le démarrage contrôle de nouveau l’historique et applique uniquement les migrations restantes avec `prisma migrate deploy`. Une base neuve est initialisée au démarrage. [Adoption d’une base Prisma](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining)

Renseigner `CIO_PRIVATE_HOST` avec le DNS privé, `CIO_PRIVATE_IP` avec l’adresse privée d’écoute et `CIO_TLS_DIRECTORY` avec le dossier contenant `fullchain.pem` et `privkey.pem`. Le certificat doit correspondre au nom DNS et être approuvé par les postes de l’entreprise. L’overlay publie Nginx sur cette adresse en HTTPS. Le port direct de Next.js reste lié à la boucle locale. Pour utiliser un proxy d’entreprise déjà en place, configurer `CIO_PUBLIC_URL` à l’origine HTTPS publique sur le réseau privé et faire pointer le proxy vers l’application.

```sh
docker compose -f docker-compose.yml -f docker-compose.https.yml up -d app https
```

Pour Whisper embarqué, placer le modèle dans `.models` et configurer `AI_AUDIO_TRANSCRIPTION_EMBEDDED_MODEL=/app/.models/ggml-base.bin` et `AI_AUDIO_TRANSCRIPTION_BACKEND=embedded`.

## Accès DSI et apprenti

Créer une inscription Entra **Web** mono-tenant dédiée à la connexion CIO Assistant. Ajouter l’URI exacte `https://<dns-privé>/api/auth/entra/callback`, puis renseigner `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID` et `ENTRA_CLIENT_SECRET` dans l’environnement Compose. La connexion utilise le code d’autorisation, PKCE S256 et les claims `tid` et `oid`. [Flux Microsoft](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow) · [Validation des claims](https://learn.microsoft.com/en-us/entra/identity-platform/claims-validation)

Initialiser le compte de secours depuis un terminal Bash avec saisie masquée. La même commande renouvelle le mot de passe et révoque les sessions de secours.

```bash
read -rsp 'Mot de passe de secours (16 caractères minimum) : ' cio_password
printf '%s' "$cio_password" | docker compose exec -T app ./node_modules/.bin/tsx scripts/account.ts local
unset cio_password
```

Connecter le DSI avec le secours, puis autoriser les membres depuis **Équipe** en choisissant le rôle et en saisissant l’ID objet Entra exact de chaque membre. Pour révoquer les sessions d’un membre, exécuter `docker compose exec app ./node_modules/.bin/tsx scripts/account.ts revoke-sessions <id-membre>`. Pour désactiver le membre, utiliser le bouton correspondant dans **Équipe**. Le rattachement d’une action historique se fait dans sa fiche en sélectionnant le bon membre.

## Claude Desktop

Dans **Paramètres → Intégrations → Claude**, télécharger `cio-assistant.mcpb` et créer un jeton dédié au poste. Installer l’extension dans Claude Desktop, puis fournir l’origine HTTPS et le jeton. Si le certificat est signé par une PKI interne, renseigner aussi le fichier PEM de l’autorité. Le jeton est affiché une seule fois. Pour le renouveler, créer le nouveau jeton, le renseigner dans l’extension, puis révoquer l’ancien dans la liste. [Extensions locales de Claude Desktop](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop)

Le connecteur local parle MCP sur `stdio` et appelle `POST /api/v1/business` par HTTPS. Les outils d’écriture demandent une clé d’idempotence. Un rejeu avec la même clé et la même requête renvoie les identifiants et liens initiaux. Le compte rendu groupé enregistre la note et les fiches liées en une transaction. Une ambiguïté de projet ou de responsable renvoie les candidats. Les jetons prennent les droits actifs de leur titulaire DSI à chaque appel.

Pour une recette conversationnelle, utiliser un projet et un texte fictifs. Demander « Enregistre ce compte rendu dans le projet X, crée une action de suivi, un risque et une décision liée, puis donne-moi les liens ». Demander ensuite une modification de l’action, vérifier le cockpit et révoquer le jeton de test.

## Sauvegarde et restauration

La sauvegarde SQLite contient les données et les tables d’authentification. La conserver dans un espace protégé. L’export **Rapports → Export métier JSON** est versionné et omet les jetons, mots de passe et sessions. Il sert à l’extraction des données, tandis que le fichier SQLite permet une restauration de l’instance. [API de sauvegarde SQLite](https://www.sqlite.org/backup.html)

```sh
docker compose exec app node scripts/database.mjs backup /app/.data/cioassistant-manual.backup
docker compose cp app:/app/.data/cioassistant-manual.backup ./cioassistant-manual.backup

docker volume create cioassistant-restored
docker run --rm --platform linux/amd64 \
  -v cioassistant-restored:/app/.data \
  -v "$PWD/cioassistant-manual.backup:/tmp/cioassistant.backup:ro" \
  cioassistant-app sh -ec '
    node scripts/database.mjs restore /tmp/cioassistant.backup
    node scripts/database.mjs check
    ./node_modules/.bin/prisma migrate deploy
    sqlite3 /app/.data/cioassistant.db "PRAGMA integrity_check; PRAGMA foreign_key_check;"
  '
```

La restauration refuse d’écraser un fichier existant. Pour vérifier une instance restaurée, déclarer `cioassistant-restored` comme volume externe `app-data` dans un fichier Compose de surcharge et utiliser un autre projet Compose et un port local libre. Reprendre le compte DSI avec la commande de secours et renouveler les jetons Claude avant l’ouverture de l’instance restaurée.

Les connexions Outlook et Planner utilisent les fichiers de session du volume et les paramètres Microsoft du déploiement. Si ces fichiers ne sont plus disponibles, reconnecter Outlook et Planner depuis **Paramètres → Intégrations**. Conserver les URI HTTPS `/api/integrations/outlook/callback` et `/api/integrations/planner/callback` dans l’inscription utilisée pour Microsoft Graph. Après connexion, resynchroniser le plan avec le projet existant et vérifier les éléments déjà rattachés.

## Recette Docker

`docker compose run --rm verify` déploie les migrations sur une base neuve, lance les tests, ESLint et la recette d’intégration. Elle lance Next.js en production et un véritable client MCP contre le processus extrait du paquet, via un serveur HTTPS de test. `scripts/verify-migration.sh` vérifie aussi un volume historique monté en lecture seule, ajoute des fiches sur une copie, restaure vers un volume de test neuf et teste le refus d’un schéma inconnu.

La connexion réelle à Entra, la synchronisation sur Microsoft Graph et la conversation Claude Desktop nécessitent des comptes connectés dans les environnements concernés. Consigner ces essais séparément de la recette Docker.
