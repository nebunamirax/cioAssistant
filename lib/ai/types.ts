import type { IntakeDecision, IntakeExecutionPlan, IntakeModule } from "@/lib/ai/intake-schema";

export type AITaskType = "summarize" | "extract" | "classify" | "suggest-project";

export interface AIRequest {
  text: string;
  context?: Record<string, string | number | boolean | null>;
}

export interface AIResult {
  task: AITaskType;
  data: Record<string, unknown>;
}

export interface AIConnectionTestResult {
  ok: boolean;
  statusCode?: number;
  message: string;
  responsePreview?: string;
}

export interface AIProvider {
  name: string;
  info: {
    provider: string;
    label: string;
    mode: string;
    model: string;
    location: "local" | "cloud";
  };
  testConnection(): Promise<AIConnectionTestResult>;
  planIntake(input: AIRequest): Promise<IntakeExecutionPlan>;
  analyzeIntake(input: AIRequest): Promise<IntakeDecision>;
  suggestDraft(module: IntakeModule, input: AIRequest): Promise<Record<string, unknown>>;
  summarize(input: AIRequest): Promise<AIResult>;
  extract(input: AIRequest): Promise<AIResult>;
  classify(input: AIRequest): Promise<AIResult>;
  suggestProject(input: AIRequest): Promise<AIResult>;
}
