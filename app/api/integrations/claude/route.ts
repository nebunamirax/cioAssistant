import { z } from "zod";
import { currentMember, digest, randomSecret } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  const actor = await currentMember();
  if (actor?.role !== "DSI") return new Response(null, { status: 403 });
  const result = z.object({ label: z.string().trim().min(1).max(120) }).safeParse(await request.json().catch(() => null));
  if (!result.success) return Response.json({ error: "Nom du jeton invalide." }, { status: 422 });
  const token = "cio_" + randomSecret();
  await prisma.claudeToken.create({ data: { userId: actor.id, label: result.data.label, hash: digest(token) } });
  return Response.json({ token }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
