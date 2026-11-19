import { spawn, spawnSync } from "node:child_process";

const postgres = process.env.CIO_DATABASE_PROVIDER === "postgresql";
const schema = postgres ? "prisma/postgresql/schema.prisma" : "prisma/schema.prisma";
const valid = postgres ? /^postgres(?:ql)?:/.test(process.env.DATABASE_URL || "") : process.env.DATABASE_URL?.startsWith("file:");
if (!valid) throw new Error("DATABASE_URL ne correspond pas au fournisseur de cette image.");
if (process.env.CIO_SHARED_APP_DATA === "true" && !postgres) {
  throw new Error("CIO_SHARED_APP_DATA requiert PostgreSQL.");
}
function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (!postgres) run(process.execPath, ["scripts/database.mjs", "check"]);
run("./node_modules/.bin/prisma", ["migrate", "deploy", "--schema", schema]);
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start"], { stdio: "inherit" });
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => server.kill(signal));
server.on("exit", (code) => process.exit(code ?? 1));
