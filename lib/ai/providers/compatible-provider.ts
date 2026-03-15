import { intakeAnalysisSchema, type IntakeAnalysis } from "@/lib/ai/intake-schema";
import { intakeSystemPrompt } from "@/lib/ai/prompts";
import { type AIProvider, type AIRequest, type AIResult } from "@/lib/ai/types";

function extractMessageContent(payload: unknown): string {
  if (!payload || typeof payload !== "object" || !("choices" in payload) || !Array.isArray(payload.choices)) {
    return "";
  }

  const firstChoice = payload.choices[0];
  if (!firstChoice || typeof firstChoice !== "object" || !("message" in firstChoice)) {
    return "";
  }

  const message = firstChoice.message;
  if (!message || typeof message !== "object" || !("content" in message)) {
    return "";
  }

  return typeof message.content === "string" ? message.content : "";
}

export class CompatibleAIProvider implements AIProvider {
  name = "compatible-provider";
  info: AIProvider["info"];

  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly apiKey?: string
  ) {
    this.info = {
      provider: "compatible",
      label: "OpenAI-compatible endpoint",
      mode: "compatible",
      model,
      location: "local"
    };
  }

  private async post(messages: Array<{ role: "system" | "user"; content: string }>, jsonMode = false) {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {})
      })
    });

    if (!response.ok) {
      throw new Error(`Compatible provider error ${response.status}`);
    }

    return response.json() as Promise<unknown>;
  }

  async analyzeIntake(input: AIRequest): Promise<IntakeAnalysis> {
    const payload = await this.post(
      [
        { role: "system", content: `${intakeSystemPrompt}\nReturn JSON only.` },
        { role: "user", content: input.text }
      ],
      true
    );

    const content = extractMessageContent(payload);
    return intakeAnalysisSchema.parse(JSON.parse(content));
  }

  private async plainTextTask(input: AIRequest, instruction: string, task: AIResult["task"]) {
    const payload = await this.post([
      { role: "system", content: instruction },
      { role: "user", content: input.text }
    ]);

    return {
      task,
      data: {
        text: extractMessageContent(payload)
      }
    } as AIResult;
  }

  summarize(input: AIRequest) {
    return this.plainTextTask(input, "Summarize the input in French in a concise operational style.", "summarize");
  }

  async extract(input: AIRequest) {
    const analysis = await this.analyzeIntake(input);
    return { task: "extract" as const, data: analysis } as AIResult;
  }

  classify(input: AIRequest) {
    return this.plainTextTask(input, "Classify the input in French and explain the likely business category.", "classify");
  }

  suggestProject(input: AIRequest) {
    return this.plainTextTask(input, "Suggest the most likely project linkage in French and explain why.", "suggest-project");
  }
}
