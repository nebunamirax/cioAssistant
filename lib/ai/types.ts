import type { IntakeAnalysis } from "@/lib/ai/intake-schema";

export type AITaskType = "summarize" | "extract" | "classify" | "suggest-project";

export interface AIRequest {
  text: string;
  context?: Record<string, string | number | boolean | null>;
}

export interface AIResult {
  task: AITaskType;
  data: Record<string, unknown>;
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
  analyzeIntake(input: AIRequest): Promise<IntakeAnalysis>;
  summarize(input: AIRequest): Promise<AIResult>;
  extract(input: AIRequest): Promise<AIResult>;
  classify(input: AIRequest): Promise<AIResult>;
  suggestProject(input: AIRequest): Promise<AIResult>;
}
