import { NextResponse } from "next/server";
import { createMeetingNote, listMeetingNotes } from "@/lib/services/meeting-note-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await listMeetingNotes({
      search: searchParams.get("search") ?? undefined,
      projectId: searchParams.get("projectId") ?? undefined
    });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const data = await createMeetingNote(payload);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
