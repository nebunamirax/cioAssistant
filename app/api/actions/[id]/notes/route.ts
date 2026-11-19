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
  if (request.headers.get("accept") === "application/json") return Response.json({ ok: true }, { status: 201 });
  const source = new URL(request.url).searchParams;
  const destination = new URL("/actions", publicUrl());
  for (const key of ["view", "projectId", "search", "status", "priority", "unassigned", "openOnly", "overdueOnly"]) {
    const value = source.get(key);
    if (value) destination.searchParams.set(key, value);
  }
  destination.searchParams.set("selectedId", id);
  destination.searchParams.set("note", "saved");
  destination.hash = "action-notes";
  return Response.redirect(destination, 303);
}
