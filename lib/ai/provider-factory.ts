import { getAIConfiguration } from "@/lib/ai/config";
import { CompatibleAIProvider } from "@/lib/ai/providers/compatible-provider";
import { LocalAIProvider } from "@/lib/ai/providers/local-provider";
import { OpenAIProvider } from "@/lib/ai/providers/openai-provider";
import { loadAppSettingsSync } from "@/lib/settings/service";
import { type AIProvider } from "@/lib/ai/types";

export function getAIProvider(): AIProvider {
  const config = getAIConfiguration();
  const settings = loadAppSettingsSync();
  const openAIApiKey = settings.ai.openAIApiKey.trim() || process.env.OPENAI_API_KEY || "";
  const compatibleApiKey = settings.ai.compatibleApiKey.trim() || process.env.AI_COMPATIBLE_API_KEY || process.env.AI_EXTERNAL_API_KEY;

  if (config.providerMode === "openai" && config.openAI.configured) {
    return new OpenAIProvider(openAIApiKey, config.openAI.model);
  }

  if (config.providerMode === "compatible" && config.compatible.configured) {
    return new CompatibleAIProvider(
      config.compatible.baseUrl,
      config.compatible.model,
      compatibleApiKey
    );
  }

  return new LocalAIProvider(config.local.model);
}
