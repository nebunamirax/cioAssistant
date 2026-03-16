import { NextResponse } from "next/server";
import { extractTextFromFile } from "@/lib/services/document-text-extractor";
import { ingestAIIntake } from "@/lib/services/ai-intake-service";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let payload: { text: string; sourceName?: string | null };

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const text = String(formData.get("text") ?? "");
      const file = formData.get("file");
      const sourceName = String(formData.get("sourceName") ?? "");

      if (file instanceof File) {
        const extractedText = await extractTextFromFile(file);
        payload = {
          text: [text.trim(), extractedText.trim()].filter(Boolean).join("\n\n"),
          sourceName: sourceName || file.name
        };
      } else {
        payload = {
          text,
          sourceName: sourceName || null
        };
      }
    } else {
      payload = await request.json();
    }

    const data = await ingestAIIntake(payload);
    return NextResponse.json({ data }, { status: data.disposition === "created" ? 201 : 202 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
