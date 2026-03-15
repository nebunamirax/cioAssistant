import { analyzeIntakeText } from "@/lib/ai/intake-analyzer";
import { type AIProvider, type AIRequest, type AIResult } from "@/lib/ai/types";

export class LocalAIProvider implements AIProvider {
  name = "local-provider";
  info: AIProvider["info"];

  constructor(private readonly model = "heuristic-v1") {
    this.info = {
      provider: "local",
      label: "Heuristic local router",
      mode: "local",
      model,
      location: "local"
    };
  }

  async analyzeIntake(input: AIRequest) {
    return analyzeIntakeText(input.text, typeof input.context?.sourceName === "string" ? input.context.sourceName : null);
  }

  async summarize(input: AIRequest): Promise<AIResult> {
    return { task: "summarize", data: { summary: input.text.slice(0, 240) } };
  }

  async extract(input: AIRequest): Promise<AIResult> {
    return { task: "extract", data: await this.analyzeIntake(input) };
  }

  async classify(input: AIRequest): Promise<AIResult> {
    return { task: "classify", data: { category: "general", confidence: 0.2, sample: input.text.slice(0, 60) } };
  }

  async suggestProject(input: AIRequest): Promise<AIResult> {
    return { task: "suggest-project", data: { suggestedProject: null, reason: "No local model configured" } };
  }
}
