import { z } from "zod";
import { currentMember, digest, randomSecret } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  const actor = await currentMember();
  if (actor?.role !== "DSI") return new Response(null, { status: 403 });
  const result = z.object({
    label: z.string().trim().min(1).max(120),
    scope: z.enum(["LECTURE", "PILOTAGE"]).default("LECTURE")
  }).safeParse(await request.json().catch(() => null));
  if (!result.success) return Response.json({ error: "Vérifiez le nom et les droits du jeton." }, { status: 422 });
  const token = "cio_" + randomSecret();
  const expiresAt = new Date(Date.now() + 90 * 86400000);
  await prisma.claudeToken.create({ data: { userId: actor.id, ...result.data, hash: digest(token), expiresAt } });
  return Response.json({ token, expiresAt }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
