import { intakeSystemPrompt } from "@/lib/ai/prompts";
import { intakeAnalysisJsonSchema, intakeAnalysisSchema, type IntakeAnalysis } from "@/lib/ai/intake-schema";
import { type AIProvider, type AIRequest, type AIResult } from "@/lib/ai/types";

function extractTextPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  if ("output_text" in payload && typeof payload.output_text === "string") {
    return payload.output_text;
  }

  if ("output" in payload && Array.isArray(payload.output)) {
    const chunks = payload.output.flatMap((item: unknown) => {
      if (!item || typeof item !== "object" || !("content" in item) || !Array.isArray(item.content)) {
        return [];
      }

      return item.content.flatMap((contentItem: unknown) => {
        if (!contentItem || typeof contentItem !== "object") {
          return [];
        }

        return "text" in contentItem && typeof contentItem.text === "string" ? [contentItem.text] : [];
      });
    });

    return chunks.join("\n").trim();
  }

  return "";
}

export class OpenAIProvider implements AIProvider {
  name = "openai-provider";
  info: AIProvider["info"];

  constructor(
    private readonly apiKey: string,
    private readonly model: string
  ) {
    this.info = {
      provider: "openai",
      label: "OpenAI Responses API",
      mode: "openai",
      model,
      location: "cloud"
    };
  }

  private async requestJSON(input: AIRequest, systemPrompt: string, schemaName: string, schema: object) {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: systemPrompt }]
          },
          {
            role: "user",
            content: [{ type: "input_text", text: input.text }]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: schemaName,
            schema,
            strict: true
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI error ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    const textPayload = extractTextPayload(payload);

    if (!textPayload) {
      throw new Error("OpenAI response did not contain parsable text output");
    }

    return JSON.parse(textPayload) as Record<string, unknown>;
  }

  private async requestText(input: AIRequest, instruction: string, task: AIResult["task"]) {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: instruction }]
          },
          {
            role: "user",
            content: [{ type: "input_text", text: input.text }]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI error ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    return { task, data: { text: extractTextPayload(payload) } } as AIResult;
  }

  async analyzeIntake(input: AIRequest): Promise<IntakeAnalysis> {
    const parsed = await this.requestJSON(input, intakeSystemPrompt, intakeAnalysisJsonSchema.name, intakeAnalysisJsonSchema.schema);
    return intakeAnalysisSchema.parse(parsed);
  }

  summarize(input: AIRequest) {
    return this.requestText(input, "Summarize the input in French in a concise operational style.", "summarize");
  }

  async extract(input: AIRequest) {
    const analysis = await this.analyzeIntake(input);
    return { task: "extract" as const, data: analysis } as AIResult;
  }

  classify(input: AIRequest) {
    return this.requestText(input, "Classify the input in French and explain the likely business category.", "classify");
  }

  suggestProject(input: AIRequest) {
    return this.requestText(input, "Suggest the most likely project linkage in French and explain why.", "suggest-project");
  }
}
