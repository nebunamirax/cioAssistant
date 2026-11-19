import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const provider = process.env.CIO_DATABASE_PROVIDER || "sqlite";
if (!["sqlite", "postgresql"].includes(provider)) throw new Error("Fournisseur de base invalide.");
if (provider === "postgresql") {
  const schema = readFileSync("prisma/schema.prisma", "utf8")
    .replace('provider = "sqlite"', 'provider = "postgresql"');
  mkdirSync("prisma/postgresql", { recursive: true });
  writeFileSync("prisma/postgresql/schema.prisma", schema);
}
