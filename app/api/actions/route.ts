import { NextResponse } from "next/server";
import { createAction, listActions } from "@/lib/services/action-service";

export async function GET() {
  const data = await listActions();
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const data = await createAction(payload);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
