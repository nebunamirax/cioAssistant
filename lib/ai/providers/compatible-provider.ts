import {
  getIntakeDraftSchema,
  intakeExecutionPlanSchema,
  intakeDecisionSchema,
  type IntakeExecutionPlan,
  type IntakeDecision,
  type IntakeModule,
  type IntakeToolCall,
  toolToModule
} from "@/lib/ai/intake-schema";
import { intakeModuleDraftPrompt, intakePlanningPrompt, intakeSystemPrompt } from "@/lib/ai/prompts";
import { buildAIContextBlock } from "@/lib/ai/request-context";
import { type AIProvider, type AIRequest, type AIResult } from "@/lib/ai/types";
import { PROJECT_TYPES } from "@/lib/domain/constants";

function toSummary(text: string) {
  return text.replace(/\r/g, "").replace(/[ \t]+/g, " ").trim().slice(0, 280);
}

const frenchMonthMap: Record<string, number> = {
  janvier: 0,
  fevrier: 1,
  février: 1,
  mars: 2,
  avril: 3,
  mai: 4,
  juin: 5,
  juillet: 6,
  aout: 7,
  août: 7,
  septembre: 8,
  octobre: 9,
  novembre: 10,
  decembre: 11,
  décembre: 11
};

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

function extractJsonObject(text: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error("Compatible provider response did not contain text output");
  }

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("Compatible provider response did not contain valid JSON");
    }

    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
  }
}

function sanitizeDueDate(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  return Number.isNaN(Date.parse(trimmed)) ? undefined : trimmed;
}

function parseExplicitDate(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();

  const slashDateMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(20\d{2})$/);
  if (slashDateMatch) {
    const [, rawDay, rawMonth, rawYear] = slashDateMatch;
    return new Date(Date.UTC(Number(rawYear), Number(rawMonth) - 1, Number(rawDay), 9, 0, 0)).toISOString();
  }

  const isoDateMatch = normalized.match(/^(20\d{2})-(\d{2})-(\d{2})$/);
  if (isoDateMatch) {
    const [, rawYear, rawMonth, rawDay] = isoDateMatch;
    return new Date(Date.UTC(Number(rawYear), Number(rawMonth) - 1, Number(rawDay), 9, 0, 0)).toISOString();
  }

  const explicitYearMatch = normalized.match(/^(\d{1,2})\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s+(20\d{2})$/i);
  if (explicitYearMatch) {
    const [, rawDay, rawMonth, rawYear] = explicitYearMatch;
    const monthIndex = frenchMonthMap[rawMonth.toLowerCase()];

    if (monthIndex !== undefined) {
      return new Date(Date.UTC(Number(rawYear), monthIndex, Number(rawDay), 9, 0, 0)).toISOString();
    }
  }

  return undefined;
}

function inferDueDateFromText(text: string) {
  const normalized = text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\r/g, " ");

  const slashDateMatch = normalized.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  if (slashDateMatch) {
    return parseExplicitDate(`${slashDateMatch[1]}/${slashDateMatch[2]}/${slashDateMatch[3]}`);
  }

  const isoDateMatch = normalized.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (isoDateMatch) {
    return parseExplicitDate(`${isoDateMatch[1]}-${isoDateMatch[2]}-${isoDateMatch[3]}`);
  }

  const explicitYearMatch = normalized.match(/\b(\d{1,2})\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s+(20\d{2})\b/i);
  if (explicitYearMatch) {
    const [, rawDay, rawMonth, rawYear] = explicitYearMatch;
    const monthIndex = frenchMonthMap[rawMonth.toLowerCase()];

    if (monthIndex !== undefined) {
      return new Date(Date.UTC(Number(rawYear), monthIndex, Number(rawDay), 9, 0, 0)).toISOString();
    }
  }

  const monthDayMatch = normalized.match(/\b(\d{1,2})\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\b/i);
  if (!monthDayMatch) {
    return undefined;
  }

  const [, rawDay, rawMonth] = monthDayMatch;
  const monthIndex = frenchMonthMap[rawMonth.toLowerCase()];

  if (monthIndex === undefined) {
    return undefined;
  }

  const now = new Date();
  const candidate = new Date(Date.UTC(now.getUTCFullYear(), monthIndex, Number(rawDay), 9, 0, 0));
  if (candidate.getTime() < now.getTime()) {
    candidate.setUTCFullYear(candidate.getUTCFullYear() + 1);
  }

  return candidate.toISOString();
}

function extractExplicitDates(text: string) {
  const normalized = text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  const matches = Array.from(
    normalized.matchAll(/\b(\d{1,2}\/\d{1,2}\/20\d{2}|20\d{2}-\d{2}-\d{2}|\d{1,2}\s+(?:janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)(?:\s+20\d{2})?)\b/gi)
  );

  return matches
    .map((match) => parseExplicitDate(match[1]) ?? (match[1].includes(" ") ? inferDueDateFromText(match[1]) : undefined))
    .filter((value): value is string => Boolean(value));
}

function inferProjectType(text: string, title?: string) {
  const normalized = `${title ?? ""} ${text}`.toLowerCase();

  if (normalized.includes("migration")) return "MIGRATION";
  if (normalized.includes("deploiement") || normalized.includes("déploiement") || normalized.includes("rollout")) return "DEPLOYMENT";
  if (normalized.includes("transformation")) return "TRANSFORMATION";
  if (normalized.includes("infrastructure")) return "INFRASTRUCTURE";
  if (normalized.includes("support")) return "SUPPORT";

  return PROJECT_TYPES[0];
}

function sanitizeRoutingConfidence(value: unknown, toolCalls: unknown[]) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(1, value));
  }

  return toolCalls.length > 0 ? 0.65 : 0.2;
}

function normalizeToolCall(toolCall: unknown, inputText: string): unknown {
  if (!toolCall || typeof toolCall !== "object" || !("tool" in toolCall) || typeof toolCall.tool !== "string" || !("args" in toolCall) || !toolCall.args || typeof toolCall.args !== "object") {
    return toolCall;
  }

  if (toolCall.tool !== "create_action") {
    if (toolCall.tool === "create_project") {
      const args = toolCall.args as Record<string, unknown>;
      const explicitDates = extractExplicitDates(inputText);

      return {
        ...toolCall,
        args: {
          ...args,
          type: typeof args.type === "string" && PROJECT_TYPES.includes(args.type as (typeof PROJECT_TYPES)[number])
            ? args.type
            : inferProjectType(inputText, typeof args.title === "string" ? args.title : undefined),
          startDate: sanitizeDueDate(args.startDate) ?? explicitDates[0],
          targetDate: sanitizeDueDate(args.targetDate) ?? explicitDates[1] ?? explicitDates[0]
        }
      };
    }

    return toolCall;
  }

  const args = toolCall.args as Record<string, unknown>;

  return {
    ...toolCall,
    args: {
      ...args,
      dueDate: sanitizeDueDate(args.dueDate) ?? inferDueDateFromText(inputText)
    }
  };
}

function normalizeDraftPayload(module: IntakeModule, payload: Record<string, unknown>, inputText: string) {
  if (module === "actions") {
    return {
      ...payload,
      dueDate: sanitizeDueDate(payload.dueDate) ?? inferDueDateFromText(inputText)
    };
  }

  if (module === "projects") {
    return {
      ...payload,
      startDate: sanitizeDueDate(payload.startDate),
      targetDate: sanitizeDueDate(payload.targetDate) ?? inferDueDateFromText(inputText)
    };
  }

  if (module === "contracts") {
    return {
      ...payload,
      startDate: sanitizeDueDate(payload.startDate),
      endDate: sanitizeDueDate(payload.endDate)
    };
  }

  return payload;
}

function normalizeDecisionPayload(payload: Record<string, unknown>, inputText: string) {
  const toolCalls = Array.isArray(payload.toolCalls) ? payload.toolCalls.map((toolCall) => normalizeToolCall(toolCall, inputText)) : [];
  const primaryModule = typeof payload.primaryModule === "string" && payload.primaryModule.trim()
    ? payload.primaryModule.trim()
    : typeof toolCalls[0] === "object" && toolCalls[0] && "tool" in toolCalls[0] && typeof toolCalls[0].tool === "string"
      ? toolToModule(toolCalls[0].tool as IntakeToolCall["tool"])
      : undefined;
  const reviewRecommended = typeof payload.reviewRecommended === "boolean"
    ? payload.reviewRecommended
    : toolCalls.length === 0;
  const reviewReason = typeof payload.reviewReason === "string" && payload.reviewReason.trim()
    ? payload.reviewReason.trim()
    : reviewRecommended
      ? "Le routage IA n’a pas trouvé de module suffisamment fiable."
      : undefined;

  return {
    ...payload,
    summary: typeof payload.summary === "string" && payload.summary.trim() ? payload.summary.trim() : toSummary(inputText),
    primaryModule,
    routingConfidence: sanitizeRoutingConfidence(payload.routingConfidence, toolCalls),
    reviewRecommended,
    reviewReason,
    toolCalls
  };
}

function normalizePlanPayload(payload: Record<string, unknown>, inputText: string) {
  return {
    summary: typeof payload.summary === "string" && payload.summary.trim() ? payload.summary.trim() : toSummary(inputText),
    steps: Array.isArray(payload.steps) ? payload.steps : []
  };
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

  async testConnection() {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: "ping" }]
      })
    });

    const rawBody = await response.text();
    const preview = rawBody.slice(0, 240);

    return {
      ok: response.ok,
      statusCode: response.status,
      message: response.ok ? "Réponse du provider compatible reçue." : `Provider compatible en erreur (${response.status}).`,
      responsePreview: preview
    };
  }

  private async post(messages: Array<{ role: "system" | "user"; content: string }>) {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
      },
      body: JSON.stringify({
        model: this.model,
        messages
      })
    });

    if (!response.ok) {
      const rawBody = await response.text();
      const preview = rawBody.slice(0, 240);
      throw new Error(
        preview ? `Compatible provider error ${response.status}: ${preview}` : `Compatible provider error ${response.status}`
      );
    }

    return response.json() as Promise<unknown>;
  }

  async analyzeIntake(input: AIRequest): Promise<IntakeDecision> {
    const userInput = `${input.text}${buildAIContextBlock(input.context)}`;
    const payload = await this.post([
      {
        role: "system",
        content: `${intakeSystemPrompt}
Return JSON only.
Do not wrap the JSON in markdown fences.
If a field is unknown, omit it or use an empty array.`
      },
      { role: "user", content: userInput }
    ]);

    const content = extractMessageContent(payload);
    return intakeDecisionSchema.parse(normalizeDecisionPayload(extractJsonObject(content), input.text));
  }

  async planIntake(input: AIRequest): Promise<IntakeExecutionPlan> {
    const userInput = `${input.text}${buildAIContextBlock(input.context)}`;
    const payload = await this.post([
      {
        role: "system",
        content: `${intakePlanningPrompt}
Return JSON only.
Do not wrap the JSON in markdown fences.
If no decomposition is needed, still return one step.`
      },
      { role: "user", content: userInput }
    ]);

    const content = extractMessageContent(payload);
    return intakeExecutionPlanSchema.parse(normalizePlanPayload(extractJsonObject(content), input.text));
  }

  async suggestDraft(module: IntakeModule, input: AIRequest) {
    const userInput = `${input.text}${buildAIContextBlock(input.context)}`;
    const payload = await this.post([
      {
        role: "system",
        content: `${intakeModuleDraftPrompt(module)}
Return JSON only.
Do not wrap the JSON in markdown fences.
If a field is unknown, omit it.`
      },
      { role: "user", content: userInput }
    ]);

    const content = extractMessageContent(payload);
    const normalized = normalizeDraftPayload(module, extractJsonObject(content), input.text);
    return getIntakeDraftSchema(module).partial().parse(normalized);
  }

  private async plainTextTask(input: AIRequest, instruction: string, task: AIResult["task"]) {
    const userInput = `${input.text}${buildAIContextBlock(input.context)}`;
    const payload = await this.post([
      { role: "system", content: instruction },
      { role: "user", content: userInput }
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
