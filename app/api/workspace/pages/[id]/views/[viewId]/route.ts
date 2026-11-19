import { currentMember } from "@/lib/auth/session";
import { businessErrorResponse } from "@/lib/business/gateway";
import { readWorkspaceView } from "@/lib/services/workspace-service";
import { workspaceViewReadFields } from "@/lib/validation/workspace";

export async function GET(request: Request, { params }: { params: Promise<{ id: string; viewId: string }> }) {
  if ((await currentMember())?.role !== "DSI") return new Response(null, { status: 403 });
  try {
    const { id, viewId } = await params;
    const query = new URL(request.url).searchParams;
    const input = workspaceViewReadFields.parse({
      pageId: id, viewId, cursor: query.get("cursor") || undefined,
      limit: query.has("limit") ? Number(query.get("limit")) : undefined
    });
    return Response.json({ data: await readWorkspaceView(input) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return businessErrorResponse(error);
  }
}
