import { type AIProvider, type AIRequest, type AIResult } from "@/lib/ai/types";

export class LocalAIProvider implements AIProvider {
  name = "local-provider";

  async summarize(input: AIRequest): Promise<AIResult> {
    return { task: "summarize", data: { summary: input.text.slice(0, 240) } };
  }

  async extract(input: AIRequest): Promise<AIResult> {
    return { task: "extract", data: { suggestions: [{ type: "action", title: input.text.slice(0, 80) }] } };
  }

  async classify(input: AIRequest): Promise<AIResult> {
    return { task: "classify", data: { category: "general", confidence: 0.2, sample: input.text.slice(0, 60) } };
  }

  async suggestProject(input: AIRequest): Promise<AIResult> {
    return { task: "suggest-project", data: { suggestedProject: null, reason: "No local model configured" } };
  }
}
