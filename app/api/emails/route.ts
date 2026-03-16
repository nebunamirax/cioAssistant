import { NextResponse } from "next/server";
import { listEmails } from "@/lib/services/email-service";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await listEmails({
      search: url.searchParams.get("search") ?? undefined,
      linkedProjectId: url.searchParams.get("linkedProjectId") ?? undefined,
      linkedActionId: url.searchParams.get("linkedActionId") ?? undefined
    });

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
