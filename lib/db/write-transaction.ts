import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export async function lockWrites(db: Prisma.TransactionClient) {
  if (process.env.DATABASE_URL?.startsWith("postgres")) {
    await db.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(739421608)`;
  } else {
    await db.$executeRaw`UPDATE "ClaudeWrite" SET "key" = "key" WHERE 0`;
  }
}

export async function writeTransaction<T>(work: (db: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async (db) => {
    await lockWrites(db);
    return work(db);
  }, { timeout: 15000, maxWait: 15000 });
}
