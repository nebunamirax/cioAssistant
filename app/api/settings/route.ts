import { NextResponse } from "next/server";
import { loadAppSettingsSync, saveAppSettings } from "@/lib/settings/service";

export async function GET() {
  return NextResponse.json({ data: loadAppSettingsSync() });
}

export async function PATCH(request: Request) {
  try {
    const payload = await request.json();
    const data = await saveAppSettings(payload);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
