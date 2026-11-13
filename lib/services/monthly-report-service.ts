import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { reportFields } from "@/lib/validation/monthly-report";
import { prisma } from "@/lib/db/prisma";

const paris = "Europe/Paris";
const monthPattern = /^\d{4}-(?:0[1-9]|1[0-2])$/;
const monthFormat = new Intl.DateTimeFormat("sv-SE", { timeZone: paris, year: "numeric", month: "2-digit" });
const offsetFormat = new Intl.DateTimeFormat("en", { timeZone: paris, timeZoneName: "longOffset" });

function shiftMonth(month: string, offset: number) {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number - 1 + offset, 1)).toISOString().slice(0, 7);
}

function monthStart(month: string) {
  const noon = new Date(`${month}-01T12:00:00Z`);
  const offset = offsetFormat.formatToParts(noon).find((part) => part.type === "timeZoneName")!.value.slice(3);
  return new Date(`${month}-01T00:00:00${offset || "Z"}`);
}

export function allowedMonths(now = new Date()) {
  const current = monthFormat.format(now);
  return [current, shiftMonth(current, -1)];
}

export function monthBounds(month: string) {
  if (!monthPattern.test(month)) throw new Error("Mois invalide.");
  return { gte: monthStart(month), lt: monthStart(shiftMonth(month, 1)) };
}

export async function saveMonthlyDraft(input: unknown, db: Prisma.TransactionClient = prisma) {
  const { month, comment } = reportFields.parse(input);
  if (!allowedMonths().includes(month)) throw new Error("Choisissez le mois courant ou précédent.");
  await db.$executeRaw`UPDATE "MonthlyReport" SET "month" = "month" WHERE 0`;
  const existing = await db.monthlyReport.findUnique({ where: { month } });
  if (existing?.archive) throw new Error("Le rapport est archivé.");
  const period = monthBounds(month);
  const progress = { status: "DONE", completedAt: period };
  const risks = { status: { in: ["OPEN", "MITIGATING"] }, criticality: { in: ["HIGH", "CRITICAL"] } };
  const decisions = { status: "PENDING" };
  const [closedCount, closed, riskCount, riskRows, decisionCount, decisionRows] = await Promise.all([
    db.action.count({ where: progress }),
    db.action.findMany({ where: progress, orderBy: [{ completedAt: "desc" }, { id: "asc" }], take: 5 }),
    db.risk.count({ where: risks }),
    db.risk.findMany({ where: risks, orderBy: [{ dueDate: "asc" }, { id: "asc" }], take: 5 }),
    db.decision.count({ where: decisions }),
    db.decision.findMany({ where: decisions, orderBy: [{ targetDate: "asc" }, { id: "asc" }], take: 5 })
  ]);
  const line = (value: string) => value.replace(/\s+/g, " ").slice(0, 180);
  const draft = [
    `# Direction mensuelle · ${month}`,
    `## Avancées · ${closedCount} actions clôturées`, ...closed.map((row) => "- " + line(row.title)),
    `## Risques opérationnels · ${riskCount}`, ...riskRows.map((row) => "- " + line(row.title)),
    `## Décisions attendues · ${decisionCount}`, ...decisionRows.map((row) => "- " + line(row.subject))
  ].join("\n");
  return db.monthlyReport.upsert({
    where: { month }, create: { month, comment, draft }, update: { comment, draft }
  });
}

export function reportContent(row: { draft: string; comment: string; archive: string | null }) {
  return row.archive ?? (row.draft + (row.comment ? "\n\n## Commentaire DSI\n" + row.comment : ""));
}

export function reportFingerprint(row: { draft: string; comment: string; archive: string | null }) {
  return createHash("sha256").update(reportContent(row)).digest("hex");
}

export async function archiveMonthly(month: string, expectedFingerprint: string) {
  return prisma.$transaction(async (db) => {
    await db.$executeRaw`UPDATE "MonthlyReport" SET "month" = "month" WHERE 0`;
    const row = await db.monthlyReport.findUniqueOrThrow({ where: { month } });
    if (reportFingerprint(row) !== expectedFingerprint) throw new Error("Le brouillon a changé. Rechargez le rapport.");
    if (row.archive) return row;
    return db.monthlyReport.update({ where: { month }, data: { archive: reportContent(row), archivedAt: new Date() } });
  });
}
