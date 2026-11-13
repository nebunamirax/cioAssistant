import { currentMember } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  if ((await currentMember())?.role !== "DSI") return new Response(null, { status: 403 });
  const records = await prisma.$transaction(async (db) => ({
    members: await db.user.findMany({ select: { id: true, name: true, email: true, role: true } }),
    objectives: await db.strategicObjective.findMany(),
    projects: await db.project.findMany(),
    milestones: await db.milestone.findMany(),
    actions: await db.action.findMany(),
    notes: await db.note.findMany(),
    services: await db.supportService.findMany(),
    controls: await db.serviceControl.findMany(),
    risks: await db.risk.findMany(),
    decisions: await db.decision.findMany(),
    vendors: await db.vendor.findMany(),
    contracts: await db.contract.findMany(),
    budget: await db.budgetItem.findMany(),
    meetings: await db.meetingNote.findMany(),
    communications: await db.communication.findMany(),
    reports: await db.monthlyReport.findMany(),
    externalSources: await db.externalSource.findMany(),
    externalItems: await db.externalItem.findMany()
  }));
  return new Response(JSON.stringify({ format: "cio-assistant-business", version: 1, exportedAt: new Date(), records }, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="cio-assistant-v1.json"', "Cache-Control": "no-store" }
  });
}
