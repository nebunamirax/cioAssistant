# Espace de travail unifié

L’entrée **Espace de travail** de CIO Assistant réunit les pages en blocs, leurs sous-pages et des vues du portefeuille métier. La connexion, la navigation, les fiches et les outils MCP appartiennent à la même application.

## Éditeur et coût

Les paquets BlockNote Community utilisés sont sous MPL 2.0. Les fonctions intégrées couvrent les titres, paragraphes, listes, cases à cocher, citations, code et tableaux. Leur utilisation professionnelle et l’auto-hébergement sont gratuits. Les données sont enregistrées dans votre base. [Licence Community](https://www.blocknotejs.org/pricing)

L’application peut se piloter depuis un client MCP déjà disponible ou avec un modèle local compatible. L’usage de Claude, ChatGPT ou d’une API de modèle dépend de votre compte chez le fournisseur choisi. L’hébergement utilise les ressources de votre ordinateur ou de votre serveur.

## Utiliser les pages

1. Dans **Espace de travail**, créez une page et saisissez votre texte dans l’éditeur. La commande `/` propose les types de blocs.
2. Dans **Configurer les vues de suivi**, choisissez les fiches à afficher, le projet et le rendu tableau ou Kanban. Enregistrez la page.
3. Ouvrez une fiche de la vue pour la modifier dans son module. Les vues se rafraîchissent toutes les 30 secondes lorsqu’elles sont visibles et possèdent un bouton d’actualisation.
4. Utilisez l’arborescence pour passer d’une page à l’autre et le fil d’Ariane pour remonter aux pages parentes. Sur mobile, ouvrez l’arborescence avec le bouton dédié. Le formulaire sous l’éditeur permet de créer une sous-page.
5. La recherche porte sur les titres et le texte. L’historique propose le téléchargement des vingt dernières révisions en Markdown. L’export métier JSON comprend toutes les pages et toutes leurs révisions.

Une vue lit directement les projets, actions, risques, décisions, contrats, budgets, réunions ou services enregistrés. Les filtres et la présentation sont stockés dans la page. Le serveur conserve les blocs complets et produit le texte utilisé pour la recherche et les assistants.

Chaque enregistrement conserve une révision avec son auteur. Le navigateur et les outils MCP présentent la version relue avant toute modification de page. Si elle a changé, le serveur renvoie un conflit et le brouillon du navigateur reste téléchargeable. Un rejeu de requête avec sa clé initiale retrouve le résultat de l’écriture.

## Première version de la base de connaissances

La première version proposée s’appuie sur les pages natives pour documenter les procédures, les notes et les décisions. Après la navigation et la recherche, le parcours prioritaire consiste à insérer un lien vers une page ou une fiche de pilotage depuis l’éditeur, puis à retrouver les pages qui citent ce document. Les pages sont actuellement réservées au rôle DSI. Le partage avec d’autres profils demande de définir les droits de lecture, d’écriture et de recherche.

Une source externe peut être utile lorsque les documents de référence sont déjà maintenus ailleurs. Un connecteur demande de définir qui peut afficher chaque document, quelle source fait foi et comment une modification ou une suppression est répercutée dans la recherche. Le choix d’un connecteur dépendra de la source réellement utilisée.

## Utiliser Claude, ChatGPT ou un autre assistant

Créez un jeton dans **Paramètres → Assistants IA** et installez le paquet MCP 1.4 pour un client stdio. Pour un client HTTP, activez `CIO_MCP_HTTP_ENABLED=true` dans `.env`, puis recréez le conteneur. L’adresse MCP est `<origine CIO Assistant>/api/mcp`, avec un jeton dédié envoyé dans `Authorization: Bearer <jeton>`.

Les outils comprennent `rechercher_pages`, `consulter_fiche` avec `entity: page`, `lire_vue`, `creer_page` et `modifier_page`. Les mêmes outils gèrent les autres fiches métier. Un jeton de lecture permet les consultations. Un jeton de pilotage permet les écritures.

Pour ChatGPT sur un réseau privé, la connexion peut passer par Secure MCP Tunnel, selon les possibilités du compte utilisé. Le tunnel peut joindre l’URL MCP ou lancer le serveur stdio extrait du paquet `.mcpb`, avec `CIO_URL` et `CIO_TOKEN` fournis par l’environnement du processus. Validez la découverte des outils et une lecture de page depuis le compte cible. [Guide Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)

## Déployer avec PostgreSQL

Renseignez `CIO_POSTGRES_PASSWORD` dans `.env` avec un secret alphanumérique long, puis utilisez les deux fichiers Compose.

```sh
docker compose -f docker-compose.yml -f docker-compose.postgresql.yml up -d --build app
```

L’image PostgreSQL de CIO Assistant utilise son schéma et ses migrations dédiés. Le démarrage vérifie le fournisseur de base et applique `prisma migrate deploy`. Les fichiers Compose HTTPS existants peuvent être ajoutés à cette commande.

Pour migrer une instance SQLite existante, ouvrez le terminal dans son projet Compose. Conservez le même nom de projet pour retrouver le volume `app-data`. Arrêtez les écritures, créez une sauvegarde et préparez une base PostgreSQL vide.

```sh
docker compose stop app
docker compose run --rm --no-deps app node scripts/database.mjs backup /app/.data/avant-postgresql.db
docker compose -f docker-compose.yml -f docker-compose.postgresql.yml build app
docker compose -f docker-compose.yml -f docker-compose.postgresql.yml up -d postgres
docker compose -f docker-compose.yml -f docker-compose.postgresql.yml run --rm app ./node_modules/.bin/prisma migrate deploy --schema prisma/postgresql/schema.prisma
docker compose -f docker-compose.yml -f docker-compose.postgresql.yml run --rm app ./node_modules/.bin/tsx scripts/migrate-sqlite-to-postgres.ts /app/.data/avant-postgresql.db
docker compose -f docker-compose.yml -f docker-compose.postgresql.yml up -d app
```

L’import lit la sauvegarde SQLite, vérifie son intégrité et ses relations, exige une destination vide et conserve les identifiants, dates, membres, sessions, jetons, liens et révisions dans une transaction. Il vérifie les nombres de fiches importées avant de valider.

PostgreSQL centralise les données métier. Les écritures MCP et de pages sont coordonnées par un verrou transactionnel.

### Préparer deux instances sur un même hôte Docker

Ajoutez `CIO_SHARED_APP_DATA=true` dans le fichier `.env` du projet Compose PostgreSQL. Toutes les instances doivent utiliser la même base PostgreSQL, le même volume Docker `app-data`, la même image et la même adresse publique `CIO_PUBLIC_URL`. Le volume contient les paramètres et les sessions Outlook et Planner. Les remplacements de fichiers sont atomiques. Les opérations Outlook, dont la synchronisation manuelle et périodique, se partagent un verrou. Une demande manuelle reçoit HTTP 409 si le verrou est toujours occupé après trois secondes. Planner utilise son propre verrou pour enregistrer ou renouveler la connexion.

Sur une stack de recette, démarrez d’abord l’instance principale pour appliquer les migrations, puis lancez la seconde sur un port local libre.

```sh
docker compose -f docker-compose.yml -f docker-compose.postgresql.yml up -d --build app
docker compose -f docker-compose.yml -f docker-compose.postgresql.yml run -d --no-deps --name cio-replica-recette -p 127.0.0.1:3083:3000 app
```

Testez le même jeton en lecture sur les deux ports. Sur un projet de recette, envoyez deux modifications concurrentes avec la même version et des clés distinctes. Une seule doit réussir. Rejouez l’écriture gagnante sur l’autre instance avec sa clé initiale et vérifiez l’identifiant renvoyé. Vérifiez que les paramètres écrits depuis une instance sont visibles sur la seconde et qu’une deuxième synchronisation Outlook attend ou reçoit HTTP 409 pendant la première. Mesurez les latences avec le volume et la concurrence attendus avant l’ouverture aux utilisateurs.

Ce mode s’appuie sur les verrous POSIX du volume Docker local. Avant un déploiement sur plusieurs hôtes, il faut disposer d’un stockage partagé qui propage ces verrous, puis refaire la recette et valider le proxy, le basculement et la reprise.

## Sauvegarder et restaurer PostgreSQL et app-data

Préparez un répertoire protégé pour la sauvegarde. Il contient les tables d’authentification et les paramètres des intégrations. Arrêtez tous les réplicas applicatifs pendant la capture pour garder PostgreSQL et le volume à un état cohérent.

```sh
umask 077
mkdir -p sauvegarde-cio
docker compose -f docker-compose.yml -f docker-compose.postgresql.yml stop app
docker compose -f docker-compose.yml -f docker-compose.postgresql.yml exec -T postgres \
  pg_dump -U cio -d cioassistant -Fc > sauvegarde-cio/postgres.dump
docker compose -f docker-compose.yml -f docker-compose.postgresql.yml run -T --rm --no-deps \
  --entrypoint tar app -C /app/.data -cf - . > sauvegarde-cio/app-data.tar
test -s sauvegarde-cio/postgres.dump && tar -tf sauvegarde-cio/app-data.tar
docker compose -f docker-compose.yml -f docker-compose.postgresql.yml start app
```

Pour la recette, utilisez un nouveau nom de projet Compose, des volumes neufs, un port local libre et la même version d’image. Sélectionnez l’adresse de recette avec `CIO_PUBLIC_URL` et gardez les connecteurs externes désactivés pendant la vérification.

```sh
recette() {
  CIO_HTTP_PORT=3084 CIO_PUBLIC_URL=http://localhost:3084 CIO_MCP_HTTP_ENABLED=true docker compose \
    -p cio-restauration -f docker-compose.yml -f docker-compose.postgresql.yml "$@"
}
recette up -d --wait postgres
recette exec -T postgres pg_restore -U cio -d cioassistant \
  --single-transaction --exit-on-error < sauvegarde-cio/postgres.dump
recette run -T --rm --no-deps --entrypoint tar app \
  -C /app/.data -xpf - < sauvegarde-cio/app-data.tar
recette up -d app
```

Vérifiez un projet et ses liens vers une action, un jalon, une décision et un risque. Comparez deux révisions d’une page avec les versions sauvegardées et retrouvez un paramètre du volume. Vérifiez la lecture avec un jeton MCP Lecture et le refus d’écriture avec ce jeton, puis créez une fiche de contrôle avec un jeton Pilotage. Consignez le temps entre le démarrage du PostgreSQL neuf et la fin des vérifications.
