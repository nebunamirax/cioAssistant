import hashlib
import os
import re
from pathlib import Path
import sqlite3
import subprocess
import sys
from datetime import datetime, timezone

MIGRATIONS = sorted(Path("prisma/migrations").glob("*/migration.sql"))
PRISMA = "./node_modules/.bin/prisma"


def readonly(path):
    return sqlite3.connect(path.resolve().as_uri() + "?mode=ro", uri=True)


def quote(identifier):
    return '"' + identifier.replace('"', '""') + '"'


def schema(db):
    objects = db.execute("SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' AND tbl_name != '_prisma_migrations'").fetchall()
    tables = {}
    for kind, name, _, sql in objects:
        if kind != "table":
            continue
        table = quote(name)
        columns = sorted(row[1:] for row in db.execute(f"PRAGMA table_xinfo({table})"))
        foreign = sorted([row[1:] for row in db.execute(f"PRAGMA foreign_key_list({table})")], key=repr)
        indexes = sorted((row[1], row[2:], tuple(db.execute(f"PRAGMA index_xinfo({quote(row[1])})"))) for row in db.execute(f"PRAGMA index_list({table})"))
        # SQLite changes column ordinals when an ALTER is replayed over db-push DDL.
        indexes = [(name, props, tuple((r[0], *r[2:]) for r in rows)) for name, props, rows in indexes]
        tables[name] = (columns, foreign, indexes)
    extra = sorted((kind, name, sql) for kind, name, _, sql in objects
                   if kind in ("view", "trigger") or re.search(
                       r"\b(?:CHECK|STRICT|COLLATE|GENERATED|WITHOUT\s+ROWID)\b", sql or "", re.IGNORECASE))

    return tables, extra


def recognize(db):
    expected = sqlite3.connect(":memory:")
    actual = schema(db)
    for index in range(len(MIGRATIONS) + 1):
        if actual == schema(expected):
            return index
        if index < len(MIGRATIONS):
            expected.executescript(MIGRATIONS[index].read_text())
    raise ValueError("Schéma SQLite inconnu. Aucune migration appliquée.")


def backup(source, target):
    if not target.parent.is_dir():
        raise ValueError("Le dossier de destination doit exister.")
    fd = os.open(target, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    os.close(fd)
    try:
        with readonly(source) as src, sqlite3.connect(target) as dest:
            src.backup(dest)
            if dest.execute("PRAGMA integrity_check").fetchone() != ("ok",):
                raise ValueError("Sauvegarde SQLite invalide.")
    except BaseException:
        target.unlink()
        raise


def history(db):
    if not db.execute("SELECT 1 FROM sqlite_schema WHERE name='_prisma_migrations'").fetchone():
        return []
    rows = db.execute("SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY started_at, rowid").fetchall()
    if any(not finished and not rolled_back for _, _, finished, rolled_back in rows):
        raise ValueError("Historique Prisma en échec.")
    applied = [(name, checksum) for name, checksum, finished, rolled_back in rows if finished and not rolled_back]
    expected = [(p.parent.name, hashlib.sha256(p.read_bytes()).hexdigest()) for p in MIGRATIONS[:len(applied)]]
    if applied != expected:
        raise ValueError("Historique Prisma inconnu.")
    return applied


def main():
    mode = sys.argv[1]
    url = os.environ["DATABASE_URL"]
    if not url.startswith("file:/") or "?" in url:
        raise ValueError("DATABASE_URL doit désigner un fichier SQLite absolu.")
    db_path = Path(url[5:])
    if mode == "backup":
        backup(db_path, Path(sys.argv[2]))
        return
    if mode == "restore":
        backup(Path(sys.argv[2]), db_path)
        return
    if not db_path.exists():
        if mode == "check":
            return
        raise ValueError("Base source absente.")
    with readonly(db_path) as db:
        matched = recognize(db)
        applied = history(db)
        if db.execute("PRAGMA foreign_key_check").fetchone():
            raise ValueError("La base contient des références orphelines.")
    if mode == "check":
        if len(applied) != matched:
            raise ValueError("Volume existant à adopter avec la commande database.mjs adopt.")
        return
    if mode != "adopt" or len(applied) > matched:
        raise ValueError("Commande ou état de migration invalide.")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    target = db_path.with_name(f"{db_path.name}.{stamp}.backup")
    backup(db_path, target)
    print(f"Sauvegarde créée dans {target}", flush=True)
    for migration in MIGRATIONS[len(applied):matched]:
        subprocess.run([PRISMA, "migrate", "resolve", "--applied", migration.parent.name], check=True)


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, sqlite3.Error, subprocess.CalledProcessError) as error:
        sys.exit(str(error))
