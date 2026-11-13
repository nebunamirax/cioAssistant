import { currentMember } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { NextResponse } from "next/server";
import { deleteAction, getActionById, updateAction } from "@/lib/services/action-service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params: paramsPromise }: RouteContext) {
  const params = await paramsPromise;
  const data = await getActionById(params.id);

  if (!data) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(request: Request, { params: paramsPromise }: RouteContext) {
  const params = await paramsPromise;
  try {
    const actor = await currentMember();
    if (!actor) return new Response(null, { status: 401 });
    const payload = await request.json();
    const data = await prisma.$transaction((db) => updateAction(params.id, payload, db, actor));
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params: paramsPromise }: RouteContext) {
  const params = await paramsPromise;
  try {
    await deleteAction(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
