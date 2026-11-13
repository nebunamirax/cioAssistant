import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { listPlannerPlans, readPlannerPlan } from "@/lib/integrations/planner";
import { saveExternalItems } from "@/lib/services/external-tracking-service";

export const dynamic = "force-dynamic";

function plannerError(error: unknown) {
  return error instanceof Error && !(error instanceof z.ZodError)
    ? error.message : "Réponse Microsoft Graph invalide.";
}

export async function GET() {
  try {
    return NextResponse.json({ data: await listPlannerPlans() });
  } catch (error) {
    return NextResponse.json({ error: plannerError(error) }, { status: 502 });
  }
}

const fields = z.object({ planId: z.string().min(1).max(250), projectId: z.string().min(1).max(250) });
const running = new Set<string>();

export async function POST(request: Request) {
  const input = fields.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Choisis un plan et un projet." }, { status: 400 });
  const { planId, projectId } = input.data;
  if (running.has(planId)) return NextResponse.json({ error: "Ce plan est déjà en cours de synchronisation." }, { status: 409 });
  running.add(planId);
  try {
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    const { plan, items } = await readPlannerPlan(planId);
    const data = await saveExternalItems({ kind: "PLANNER", key: plan.id, title: plan.title, projectId }, items);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: plannerError(error) }, { status: 502 });
  } finally {
    running.delete(planId);
  }
}
