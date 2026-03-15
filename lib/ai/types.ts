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
  summarize(input: AIRequest): Promise<AIResult>;
  extract(input: AIRequest): Promise<AIResult>;
  classify(input: AIRequest): Promise<AIResult>;
  suggestProject(input: AIRequest): Promise<AIResult>;
}
