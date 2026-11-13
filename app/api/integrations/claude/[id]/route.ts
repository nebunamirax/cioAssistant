import { currentMember } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if ((await currentMember())?.role !== "DSI") return new Response(null, { status: 403 });
  const { id } = await params;
  const result = await prisma.claudeToken.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } });
  return new Response(null, { status: result.count ? 204 : 404 });
}
