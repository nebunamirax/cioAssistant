import { NextResponse } from "next/server";
import { deleteAction, getActionById, updateAction } from "@/lib/services/action-service";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(_: Request, { params }: RouteContext) {
  const data = await getActionById(params.id);

  if (!data) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const payload = await request.json();
    const data = await updateAction(params.id, payload);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    await deleteAction(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
