import { NextResponse } from "next/server";
import { createActionsFromMeetingNote } from "@/lib/services/meeting-note-service";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(_: Request, { params }: RouteContext) {
  try {
    const data = await createActionsFromMeetingNote(params.id);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
