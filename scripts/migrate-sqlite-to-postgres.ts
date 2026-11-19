import { spawnSync } from "node:child_process";
import { Prisma, PrismaClient } from "@prisma/client";

const source = process.argv[2];
if (!source?.startsWith("/")) throw new Error("Indiquez le chemin absolu de la sauvegarde SQLite.");
if (!process.env.DATABASE_URL?.startsWith("postgres")) throw new Error("La destination doit être PostgreSQL.");
const models = Prisma.dmmf.datamodel.models;
const extracted = spawnSync("python3", ["-c", `
import json, sqlite3, sys
from pathlib import Path
with sqlite3.connect(Path(sys.argv[1]).resolve().as_uri() + "?mode=ro", uri=True) as db:
    if db.execute("PRAGMA integrity_check").fetchone() != ("ok",):
        raise ValueError("Sauvegarde SQLite invalide.")
    if db.execute("PRAGMA foreign_key_check").fetchone():
        raise ValueError("La source contient des références orphelines.")
    db.row_factory = sqlite3.Row
    names = {row[0] for row in db.execute("SELECT name FROM sqlite_schema WHERE type='table'")}
    result = {}
    for name in json.loads(sys.argv[2]):
        if name in names:
            result[name] = [dict(row) for row in db.execute('SELECT * FROM "' + name + '"')]
    json.dump(result, sys.stdout)
`, source, JSON.stringify(models.map((model) => model.name))], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
if (extracted.status !== 0) throw new Error("La sauvegarde source ne peut pas être lue ou validée.");
const records = JSON.parse(extracted.stdout) as Record<string, Record<string, unknown>[]>;
const ordered: typeof models[number][] = [];
const pending = [...models];
while (pending.length) {
  const index = pending.findIndex((model) => model.fields
    .filter((field) => field.kind === "object" && field.relationFromFields?.length && field.type !== model.name)
    .every((field) => ordered.some((previous) => previous.name === field.type)));
  if (index < 0) throw new Error("Les dépendances du schéma ne peuvent pas être ordonnées.");
  ordered.push(pending.splice(index, 1)[0]);
}

const prisma = new PrismaClient();
type Delegate = {
  count(): Promise<number>;
  createMany(args: { data: Record<string, unknown>[] }): Promise<unknown>;
};
async function migrate() {
  const totals: Record<string, number> = {};
  await prisma.$transaction(async (db) => {
    await db.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(739421608)`;
    for (const model of ordered) {
      const delegate = db[model.name.replace(/^./, (letter) => letter.toLowerCase()) as keyof typeof db] as unknown as Delegate;
      if (await delegate.count()) throw new Error("La destination contient déjà des données. Utilisez une base PostgreSQL vide.");
    }
    for (const model of ordered) {
      const delegate = db[model.name.replace(/^./, (letter) => letter.toLowerCase()) as keyof typeof db] as unknown as Delegate;
      let rows = records[model.name] ?? [];
      if (model.name === "WorkspacePage") {
        const sorted: typeof rows = [];
        const remaining = [...rows];
        const visited = new Set<unknown>();
        while (remaining.length) {
          const index = remaining.findIndex((row) => !row.parentId || visited.has(row.parentId));
          if (index < 0) throw new Error("La hiérarchie des pages source est incohérente.");
          const row = remaining.splice(index, 1)[0];
          sorted.push(row);
          visited.add(row.id);
        }
        rows = sorted;
      }
      const data = rows.map((row) => Object.fromEntries(model.fields
        .filter((field) => field.kind !== "object" && field.name in row)
        .map((field) => {
          let value = row[field.name];
          if (value !== null && field.type === "DateTime") {
            value = new Date(typeof value === "number" ? value : String(value));
            if (Number.isNaN((value as Date).getTime())) throw new Error("Une date source est invalide.");
          }
          if (value !== null && field.type === "Boolean") value = Boolean(value);
          return [field.name, value];
        })));
      // Insert a hierarchy in order, since foreign keys are checked at each statement.
      const batchSize = model.name === "WorkspacePage" ? 1 : 300;
      for (let index = 0; index < data.length; index += batchSize) await delegate.createMany({ data: data.slice(index, index + batchSize) });
      totals[model.name] = data.length;
      if (await delegate.count() !== data.length) throw new Error("Le contrôle du nombre de fiches a échoué.");
    }
  }, { timeout: 120000, maxWait: 30000 });
  console.log("Migration validée et enregistrée.", JSON.stringify(totals));
}

migrate().catch((error) => {
  console.error(error instanceof Error ? error.message : "Migration interrompue.");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
