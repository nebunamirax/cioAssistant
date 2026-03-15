import { ExternalAIProvider } from "@/lib/ai/providers/external-provider";
import { LocalAIProvider } from "@/lib/ai/providers/local-provider";
import { type AIProvider } from "@/lib/ai/types";

export function getAIProvider(): AIProvider {
  const mode = process.env.AI_PROVIDER_MODE ?? "local";
  if (mode === "external") {
    return new ExternalAIProvider(process.env.AI_EXTERNAL_BASE_URL ?? "");
  }
  return new LocalAIProvider();
}
