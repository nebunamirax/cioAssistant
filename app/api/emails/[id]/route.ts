import { NextResponse } from "next/server";
import { updateEmail } from "@/lib/services/email-service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, { params: paramsPromise }: RouteContext) {
  const params = await paramsPromise;
  try {
    const payload = await request.json();
    const data = await updateEmail(params.id, payload);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
