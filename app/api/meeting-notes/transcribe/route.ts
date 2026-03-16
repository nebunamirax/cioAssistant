import { NextResponse } from "next/server";
import { transcribeMeetingAudio } from "@/lib/services/meeting-audio-transcription-service";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Aucun fichier audio recu." }, { status: 400 });
    }

    const data = await transcribeMeetingAudio(file);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
