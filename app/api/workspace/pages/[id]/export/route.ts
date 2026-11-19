import { currentMember } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { businessErrorResponse } from "@/lib/business/gateway";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if ((await currentMember())?.role !== "DSI") return new Response(null, { status: 403 });
  try {
    const revision = z.coerce.number().int().positive().parse(new URL(request.url).searchParams.get("revision"));
    const row = await prisma.workspaceRevision.findUnique({ where: { pageId_revision: { pageId: (await params).id, revision } } });
    if (!row) return new Response(null, { status: 404 });
    return new Response("# " + row.title + "\n\n" + row.contentMarkdown, {
      headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="page-v${revision}.md"`, "Cache-Control": "no-store" }
    });
  } catch (error) {
    return businessErrorResponse(error);
  }
}
