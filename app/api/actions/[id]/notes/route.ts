import { z } from "zod";
import { currentMember, publicUrl } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await currentMember();
  if (!actor) return new Response(null, { status: 401 });
  const { id } = await context.params;
  const action = await prisma.action.findUnique({ where: { id }, select: { ownerId: true } });
  if (!action || (actor.role !== "DSI" && action.ownerId !== actor.id)) return new Response(null, { status: 403 });
  const content = z.string().trim().min(1).max(5000).safeParse((await request.formData()).get("content"));
  if (!content.success) return new Response("Note invalide", { status: 422 });
  await prisma.note.create({ data: { entityType: "ACTION", entityId: id, title: actor.name, content: content.data } });
  return Response.redirect(new URL(`/actions?selectedId=${encodeURIComponent(id)}`, publicUrl()), 303);
}
