import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

const fields = z.object({
  title: z.string().trim().min(3).max(240),
  ownerName: z.string().trim().max(120),
  dueDate: z.union([z.literal(""), z.string().datetime()]),
  projectId: z.string()
});

export async function POST(request: Request, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const input = fields.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Vérifie le titre, le responsable et l’échéance." }, { status: 400 });

  try {
    const action = await prisma.$transaction(async (db) => {
      const email = await db.email.findUnique({ where: { id: params.id } });
      if (!email) return null;
      if (email.linkedActionId) return { id: email.linkedActionId };
      const { title, ownerName, dueDate, projectId } = input.data;
      const created = await db.action.create({
        data: {
          title,
          ownerName: ownerName || null,
          dueDate: dueDate ? new Date(dueDate) : null,
          projectId: projectId || null,
          description: email.snippet,
          sourceType: "EMAIL",
          sourceRef: email.id
        },
        select: { id: true }
      });
      await db.email.update({ where: { id: email.id }, data: { linkedActionId: created.id, linkedProjectId: projectId || null } });
      return created;
    });
    if (!action) return NextResponse.json({ error: "Ce message est introuvable." }, { status: 404 });
    return NextResponse.json({ data: action });
  } catch {
    return NextResponse.json({ error: "Impossible de créer l’action. Vérifie le projet sélectionné puis réessaie." }, { status: 409 });
  }
}
