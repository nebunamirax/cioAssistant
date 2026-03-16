import { intakeModuleDraftPrompt, intakePlanningPrompt, intakeSystemPrompt } from "@/lib/ai/prompts";
import { buildAIContextBlock } from "@/lib/ai/request-context";
import {
  getIntakeDraftJsonSchema,
  getIntakeDraftSchema,
  intakeExecutionPlanJsonSchema,
  intakeExecutionPlanSchema,
  intakeDecisionJsonSchema,
  intakeDecisionSchema,
  type IntakeDecision,
  type IntakeExecutionPlan,
  type IntakeModule
} from "@/lib/ai/intake-schema";
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

  async testConnection() {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        input: "ping"
      })
    });

    const rawBody = await response.text();
    const preview = rawBody.slice(0, 240);

    return {
      ok: response.ok,
      statusCode: response.status,
      message: response.ok ? "Réponse OpenAI reçue." : `Réponse OpenAI en erreur (${response.status}).`,
      responsePreview: preview
    };
  }

  private async requestJSON(input: AIRequest, systemPrompt: string, schemaName: string, schema: object) {
    const userInput = `${input.text}${buildAIContextBlock(input.context)}`;
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
            content: [{ type: "input_text", text: userInput }]
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
    const userInput = `${input.text}${buildAIContextBlock(input.context)}`;
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
            content: [{ type: "input_text", text: userInput }]
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

  async analyzeIntake(input: AIRequest): Promise<IntakeDecision> {
    const parsed = await this.requestJSON(input, intakeSystemPrompt, intakeDecisionJsonSchema.name, intakeDecisionJsonSchema.schema);
    return intakeDecisionSchema.parse(parsed);
  }

  async planIntake(input: AIRequest): Promise<IntakeExecutionPlan> {
    const parsed = await this.requestJSON(input, intakePlanningPrompt, intakeExecutionPlanJsonSchema.name, intakeExecutionPlanJsonSchema.schema);
    return intakeExecutionPlanSchema.parse(parsed);
  }

  async suggestDraft(module: IntakeModule, input: AIRequest) {
    const schema = getIntakeDraftJsonSchema(module);
    const parsed = await this.requestJSON(input, intakeModuleDraftPrompt(module), schema.name, schema.schema);
    return getIntakeDraftSchema(module).partial().parse(parsed);
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
