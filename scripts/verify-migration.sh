#!/bin/sh
set -eu

# Run against a backup or a read-only mount of an existing instance.
source=${1:?Source SQLite requise}
target=${2:?Chemin de restauration requis}
export DATABASE_URL="file:$source"
node scripts/database.mjs backup /tmp/cio-legacy.db
export DATABASE_URL=file:/tmp/cio-legacy.db
sqlite3 /tmp/cio-legacy.db <<'SQL'
PRAGMA foreign_keys = ON;
INSERT INTO "Project" ("id","title","type","updatedAt") VALUES ('recipe-project','Projet historique','SUPPORT',CURRENT_TIMESTAMP);
INSERT INTO "Action" ("id","title","projectId","ownerName","updatedAt") VALUES ('recipe-action','Action historique','recipe-project','Nom historique',CURRENT_TIMESTAMP);
INSERT INTO "ExternalSource" ("id","kind","key","title","projectId") VALUES ('recipe-source','TICKET_CSV','recipe-csv','Export historique','recipe-project');
INSERT INTO "ExternalItem" ("id","sourceId","externalId","title","status","lastSyncedAt") VALUES ('recipe-ticket','recipe-source','T-42','Ticket historique','BLOCKED',CURRENT_TIMESTAMP);
SQL
node scripts/database.mjs adopt
./node_modules/.bin/prisma migrate deploy
node scripts/database.mjs check
node scripts/database.mjs backup /tmp/cio-restore.backup
export DATABASE_URL="file:$target"
node scripts/database.mjs restore /tmp/cio-restore.backup
node scripts/database.mjs check
[ "$(sqlite3 "$target" 'PRAGMA integrity_check')" = "ok" ]
[ -z "$(sqlite3 "$target" 'PRAGMA foreign_key_check')" ]
[ "$(sqlite3 "$target" "SELECT ownerName FROM Action WHERE id='recipe-action'")" = "Nom historique" ]
[ "$(sqlite3 "$target" "SELECT title FROM ExternalItem WHERE id='recipe-ticket'")" = "Ticket historique" ]

sqlite3 /tmp/cio-unknown.db 'CREATE TABLE unexpected(id TEXT);'
export DATABASE_URL=file:/tmp/cio-unknown.db
if node scripts/database.mjs adopt; then
  echo 'Une base inconnue a été acceptée.' >&2
  exit 1
fi
[ "$(sqlite3 /tmp/cio-unknown.db 'SELECT name FROM sqlite_schema')" = "unexpected" ]
echo "Migration et restauration vérifiées, avec conservation des fiches et refus d’un schéma inconnu."
