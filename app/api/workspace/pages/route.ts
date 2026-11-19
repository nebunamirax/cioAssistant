import { currentMember } from "@/lib/auth/session";
import { businessErrorResponse, commitBusinessWrite, readBusinessBody } from "@/lib/business/gateway";
import { keyField } from "@/lib/business/contracts";
import { listWorkspacePages } from "@/lib/services/workspace-service";
import { workspaceListFields, workspacePageFields } from "@/lib/validation/workspace";
import { z } from "zod";

export async function GET(request: Request) {
  if ((await currentMember())?.role !== "DSI") return new Response(null, { status: 403 });
  try {
    const params = new URL(request.url).searchParams;
    const input = workspaceListFields.parse({
      query: params.get("query") ?? undefined,
      parentId: params.has("parentId") ? params.get("parentId") || null : undefined,
      cursor: params.get("cursor") || undefined,
      limit: params.has("limit") ? Number(params.get("limit")) : undefined
    });
    return Response.json({ data: await listWorkspacePages(input) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return businessErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const actor = await currentMember();
  if (actor?.role !== "DSI") return new Response(null, { status: 403 });
  try {
    const input = z.object({ key: keyField, fields: workspacePageFields.strict() }).strict().parse(await readBusinessBody(request));
    const result = await commitBusinessWrite({ userId: actor.id }, "create", { ...input, entity: "page" });
    return Response.json({ data: result.saved[0] }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return businessErrorResponse(error);
  }
}
