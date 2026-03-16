import { NextResponse } from "next/server";
import { updateEmail } from "@/lib/services/email-service";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const payload = await request.json();
    const data = await updateEmail(params.id, payload);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
