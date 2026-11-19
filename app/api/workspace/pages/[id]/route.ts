import { currentMember } from "@/lib/auth/session";
import { getBusiness } from "@/lib/business/service";
import { keyField, versionField } from "@/lib/business/contracts";
import { businessErrorResponse, commitBusinessWrite, readBusinessBody } from "@/lib/business/gateway";
import { workspacePageFields } from "@/lib/validation/workspace";
import { z } from "zod";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Context) {
  if ((await currentMember())?.role !== "DSI") return new Response(null, { status: 403 });
  try {
    return Response.json({ data: await getBusiness({ entity: "page", id: (await params).id }) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return businessErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  const actor = await currentMember();
  if (actor?.role !== "DSI") return new Response(null, { status: 403 });
  try {
    const input = z.object({ key: keyField, expectedVersion: versionField, fields: workspacePageFields.strict() }).strict().parse(await readBusinessBody(request));
    const result = await commitBusinessWrite({ userId: actor.id }, "update", { ...input, entity: "page", id: (await params).id });
    return Response.json({ data: result.saved[0] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return businessErrorResponse(error);
  }
}
