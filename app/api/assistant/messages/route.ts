import { NextResponse } from "next/server";
import { extractTextFromFile } from "@/lib/services/document-text-extractor";
import { ingestAIIntake } from "@/lib/services/ai-intake-service";
import { buildAssistantMessageResponse } from "@/lib/services/assistant-message-service";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const text = String(formData.get("text") ?? "").trim();
    const file = formData.get("file");
    const fallbackSourceName = String(formData.get("sourceName") ?? "").trim() || null;

    let normalizedText = text;
    let sourceName = fallbackSourceName;

    if (file instanceof File) {
      const extractedText = await extractTextFromFile(file);
      normalizedText = [text, extractedText.trim()].filter(Boolean).join("\n\n");
      sourceName = fallbackSourceName ?? file.name;
    }

    const result = await ingestAIIntake({
      text: normalizedText,
      sourceName
    });

    const data = buildAssistantMessageResponse({
      text: normalizedText,
      sourceName,
      result
    });

    return NextResponse.json(
      { data },
      { status: result.disposition === "created" ? 201 : 202 }
    );
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
