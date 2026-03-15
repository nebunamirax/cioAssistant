import { type AIProvider, type AIRequest, type AIResult } from "@/lib/ai/types";

export class ExternalAIProvider implements AIProvider {
  name = "external-provider";

  constructor(private readonly baseUrl: string) {}

  private async post(task: string, input: AIRequest): Promise<AIResult> {
    if (!this.baseUrl) {
      return { task: task as AIResult["task"], data: { error: "External AI base URL not configured" } };
    }

    const response = await fetch(`${this.baseUrl}/${task}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      return { task: task as AIResult["task"], data: { error: `Provider error ${response.status}` } };
    }

    return response.json() as Promise<AIResult>;
  }

  summarize(input: AIRequest) {
    return this.post("summarize", input);
  }
  extract(input: AIRequest) {
    return this.post("extract", input);
  }
  classify(input: AIRequest) {
    return this.post("classify", input);
  }
  suggestProject(input: AIRequest) {
    return this.post("suggest-project", input);
  }
}
