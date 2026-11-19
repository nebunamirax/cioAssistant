# Pilotage DSI partagé

## Installer sur le PC du bureau

Démarrez Docker Desktop en mode conteneurs Linux. Si le dépôt manque sur le PC, récupérez-le avec `git clone https://github.com/nebunamirax/cioAssistant.git`, puis ouvrez PowerShell dans le dossier `cioAssistant`.

```powershell
git pull --ff-only origin main
docker compose up -d --build app
```

Lorsque la page de connexion s’affiche sur [Pilotage DSI](http://localhost:3000), créez le compte DSI local pour une première installation. PowerShell masque la saisie du mot de passe de 16 caractères minimum.

```powershell
& {
  $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
  $cioPassword = Read-Host "Mot de passe DSI local" -AsSecureString
  try {
    [System.Net.NetworkCredential]::new('', $cioPassword).Password | docker compose exec -T app ./node_modules/.bin/tsx scripts/account.ts local
  } finally {
    $cioPassword.Dispose()
  }
}
```

Connectez-vous, puis suivez la section [Claude Desktop](#claude-desktop). Si le port 3000 est occupé, définissez `CIO_HTTP_PORT=3080` dans `.env`, relancez `docker compose up -d app` et utilisez `http://localhost:3080` dans les deux applications. Si `.env` contient déjà `CIO_PUBLIC_URL`, alignez cette adresse sur le port choisi. Le port Docker reste publié sur la boucle locale et le volume `app-data` conserve les données.

## Mettre à jour l’instance existante

Lancer les commandes depuis le même projet Compose que l’instance en cours pour retrouver le volume `app-data`. Conserver son nom de projet si l’instance a été lancée avec `-p`.

```sh
docker compose build app verify
docker compose run --rm verify
docker compose stop app
docker compose run --rm --no-deps app node scripts/database.mjs adopt
```

La commande d’adoption reconnaît le schéma avant toute écriture. Elle réalise une sauvegarde datée dans le volume, puis inscrit les migrations déjà présentes. Si elle signale un schéma inconnu ou des références orphelines, conserver la base et examiner l’écart. Le démarrage contrôle de nouveau l’historique et applique uniquement les migrations restantes avec `prisma migrate deploy`. Une base neuve est initialisée au démarrage. [Adoption d’une base Prisma](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining)

Pour une instance locale, redémarrez avec `docker compose up -d app`.

## Partager une instance sur le réseau en HTTPS

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

1. Dans CIO Assistant, ouvrez **Paramètres → Intégrations → Assistants IA**, téléchargez `cio-assistant.mcpb` et créez un jeton dédié au poste. Copiez le jeton au moment de sa création.
2. Dans Claude Desktop, ouvrez **Paramètres → Application de bureau → Extensions → Gérer → Paramètres avancés → Installer une extension**, puis sélectionnez le fichier téléchargé. Pour une extension déjà installée, installez le paquet mis à jour. [Extensions locales de Claude Desktop](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop)
3. Collez le jeton et l’adresse affichée dans CIO Assistant. Utilisez `http://localhost:3000` lorsque Docker et Claude Desktop tournent sur le même PC. Pour une instance partagée, utilisez son adresse HTTPS et, si le certificat est signé par une PKI interne, ajoutez le fichier PEM de l’autorité.
4. Dans une conversation Claude, ouvrez **+ → Connecteurs** et vérifiez que **CIO Assistant** apparaît. Essayez « Consulte la roadmap de CIO Assistant et résume les prochains jalons des projets actifs. »

Le paquet privé généré par Docker est non signé. Si l’installation est bloquée par la politique Claude Desktop du poste, demandez à l’administrateur Claude de l’autoriser. [Gestion des extensions en entreprise](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop)

Le connecteur parle MCP sur `stdio` et appelle `POST /api/v1/business`. `lire_cockpit` renvoie les mêmes priorités que le tableau de bord, avec les liens vers les fiches. Sélectionnez **Lecture seule** pour les synthèses et **Lecture et modification des fiches** pour mettre à jour des projets, des jalons et des actions ou enregistrer un compte rendu avec ses actions, risques et décisions en une transaction.

Les nouveaux jetons expirent au bout de 90 jours. Les jetons antérieurs à la version 1.2 conservent leurs droits d’écriture et leur durée d’origine. Pour renouveler un jeton, créez son remplaçant, renseignez-le dans Claude, puis révoquez l’ancien dans CIO Assistant. Les droits du titulaire DSI sont vérifiés à chaque appel. Les outils d’écriture demandent une clé d’idempotence. Un rejeu avec la même clé et la même requête renvoie les identifiants et liens initiaux. Une ambiguïté de projet ou de responsable renvoie les candidats.

Pour une recette conversationnelle, utiliser un projet et un texte fictifs. Demander « Enregistre ce compte rendu dans le projet X, crée une action de suivi, un risque et une décision liée, puis donne-moi les liens ». Demander ensuite une modification de l’action, vérifier le cockpit et révoquer le jeton de test.

Pour utiliser les pages et leurs vues liées, connecter ChatGPT ou déployer PostgreSQL, suivez le [guide de l’espace de travail](espace-de-travail.md).

## Démontrer le produit sur des données fictives

Ce projet Compose utilise un volume dédié à la démo et écoute sur le port 3082. Depuis Bash ou Zsh, lancez les commandes suivantes. La base d’exemple place ses échéances autour du jour du chargement.

```bash
export CIO_HTTP_PORT=3082 CIO_PUBLIC_URL=http://localhost:3082 AI_PROVIDER_MODE=local
docker compose -p cio-demo up -d --build app
```

Une fois la page de connexion accessible sur [localhost:3082](http://localhost:3082), chargez les fiches fictives et créez le compte local.

```bash
docker compose -p cio-demo exec app npm run prisma:seed
printf 'Mot de passe de démonstration (16 caractères minimum) : '
stty -echo
IFS= read -r cio_demo_password
stty echo
printf '\n'
printf '%s' "$cio_demo_password" | docker compose -p cio-demo exec -T app ./node_modules/.bin/tsx scripts/account.ts local
unset cio_demo_password
```

1. Ouvrez [le cockpit de démonstration](http://localhost:3082), filtrez les urgences puis ouvrez l’arbitrage ERP. Passez-le à **Approuvée** et retrouvez la mise à jour dans la revue.
2. Dans **Assistant → Compte rendu**, sélectionnez **Modernisation ERP finance**. Collez `- Préparer le support du COPIL`, analysez le texte, puis validez la création proposée. Ouvrez l’action à partir du résultat.
3. Depuis **Revue hebdo**, exportez le brief. Ouvrez ensuite **Préparer le CODIR** pour voir le rapport de direction.
4. Installez l’extension avec l’adresse de démonstration et demandez à Claude de résumer les urgences. Avec un jeton de pilotage, demandez-lui de passer l’action de préparation du COPIL à **En cours** puis contrôlez le statut dans CIO Assistant.

Arrêtez la démo avec `docker compose -p cio-demo down`. Le volume dédié reste disponible pour la prochaine présentation.

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

`docker compose run --rm verify` déploie les migrations sur une base neuve, lance les tests, ESLint et la recette d’intégration. Elle télécharge le paquet depuis CIO Assistant et démarre le connecteur extrait via un client MCP. Elle vérifie la lecture et l’écriture sur `localhost` en HTTP ainsi que l’accès via un serveur HTTPS de test. `scripts/verify-migration.sh` vérifie aussi un volume historique monté en lecture seule, ajoute des fiches sur une copie, restaure vers un volume de test neuf et teste le refus d’un schéma inconnu.

La connexion réelle à Entra, la synchronisation sur Microsoft Graph et la conversation Claude Desktop nécessitent des comptes connectés dans les environnements concernés. Consigner ces essais séparément de la recette Docker.
