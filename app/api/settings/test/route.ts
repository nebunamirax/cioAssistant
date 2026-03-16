import { NextResponse } from "next/server";
import { runSettingsTest } from "@/lib/settings/test-service";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const data = await runSettingsTest(payload.settings, payload.scope);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
