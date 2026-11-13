import { readFileSync } from "node:fs";
import { prisma } from "../lib/db/prisma";
import { hashPassword } from "../lib/auth/password";

async function main() {
  const [operation, ...args] = process.argv.slice(2);
  if (operation === "local") {
    const password = readFileSync(0, "utf8").replace(/\r?\n$/, "");
    if (password.length < 16 || password.length > 256) throw new Error("Mot de passe de 16 à 256 caractères requis sur stdin.");
    const passwordHash = hashPassword(password);
    await prisma.$transaction(async (db) => {
      const user = await db.user.upsert({
        where: { id: "local-dsi" },
        create: { id: "local-dsi", name: "DSI de secours", email: "dsi-secours@localhost", enabled: true, role: "DSI", passwordHash },
        update: { passwordHash, enabled: true, role: "DSI" }
      });
      await db.session.deleteMany({ where: { userId: user.id } });
      await db.loginAttempt.deleteMany({ where: { id: "local" } });
    });
    return;
  }
  if (operation === "revoke-sessions" && args[0]) {
    await prisma.session.deleteMany({ where: { userId: args[0] } });
    return;
  }
  throw new Error("Commandes disponibles : local, revoke-sessions <id>.");
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
