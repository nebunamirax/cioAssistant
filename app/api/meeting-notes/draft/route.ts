import { NextResponse } from "next/server";
import { z } from "zod";
import { generateMeetingNoteDraft } from "@/lib/services/meeting-note-draft-service";

const meetingDraftRequestSchema = z.object({
  rawContent: z.string().trim().min(1),
  meetingDate: z.string().datetime().optional().nullable()
});

export async function POST(request: Request) {
  try {
    const payload = meetingDraftRequestSchema.parse(await request.json());
    const data = await generateMeetingNoteDraft(payload.rawContent, payload.meetingDate ?? null);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
