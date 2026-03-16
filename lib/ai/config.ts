import { loadAppSettingsSync } from "@/lib/settings/service";
import type { AppSettings } from "@/lib/settings/schema";

export type AIProviderMode = "local" | "openai" | "compatible";
export type AIModelLocation = "local" | "cloud";

export type AIModelOption = {
  id: string;
  label: string;
  providerMode: AIProviderMode;
  location: AIModelLocation;
};

export type AIConfiguration = {
  providerMode: AIProviderMode;
  activeModel: string;
  openAI: {
    configured: boolean;
    model: string;
    models: AIModelOption[];
  };
  compatible: {
    configured: boolean;
    baseUrl: string;
    model: string;
    models: AIModelOption[];
  };
  local: {
    model: string;
    models: AIModelOption[];
  };
};

function parseModelList(value: string | undefined, providerMode: AIProviderMode, location: AIModelLocation) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map<AIModelOption>((id) => ({
      id,
      label: id,
      providerMode,
      location
    }));
}

function uniqueModels(items: AIModelOption[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.providerMode}:${item.id}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function getAIConfiguration(settingsOverride?: AppSettings): AIConfiguration {
  const settings = settingsOverride ?? loadAppSettingsSync();
  const rawMode = process.env.AI_PROVIDER_MODE?.toLowerCase();
  const providerMode: AIProviderMode = settings.ai.providerMode
    ?? (rawMode === "openai" ? "openai" : rawMode === "compatible" || rawMode === "external" ? "compatible" : "local");

  const localModel = settings.ai.localModel.trim() || process.env.AI_MODEL?.trim() || "heuristic-v1";
  const openAIModel = settings.ai.openAIModel.trim() || process.env.OPENAI_MODEL?.trim() || "";
  const compatibleBaseUrl =
    settings.ai.compatibleBaseUrl.trim() || process.env.AI_COMPATIBLE_BASE_URL?.trim() || process.env.AI_EXTERNAL_BASE_URL?.trim() || "";
  const compatibleModel = settings.ai.compatibleModel.trim() || process.env.AI_COMPATIBLE_MODEL?.trim() || process.env.AI_MODEL?.trim() || "";
  const openAIApiKey = settings.ai.openAIApiKey.trim() || process.env.OPENAI_API_KEY?.trim() || "";
  const compatibleApiKey = settings.ai.compatibleApiKey.trim() || process.env.AI_COMPATIBLE_API_KEY?.trim() || process.env.AI_EXTERNAL_API_KEY?.trim() || "";

  const localModels = uniqueModels([
    { id: "heuristic-v1", label: "heuristic-v1", providerMode: "local", location: "local" },
    ...parseModelList(settings.ai.localModels || process.env.AI_LOCAL_MODELS, "local", "local"),
    ...(localModel && localModel !== "heuristic-v1"
      ? [{ id: localModel, label: localModel, providerMode: "local" as const, location: "local" as const }]
      : [])
  ]);

  const openAIModels = uniqueModels([
    ...parseModelList(settings.ai.openAIModels || process.env.AI_OPENAI_MODELS, "openai", "cloud"),
    ...(openAIModel
      ? [{ id: openAIModel, label: openAIModel, providerMode: "openai" as const, location: "cloud" as const }]
      : [])
  ]);

  const compatibleModels = uniqueModels([
    ...parseModelList(settings.ai.compatibleModels || process.env.AI_COMPATIBLE_MODELS, "compatible", "local"),
    ...(compatibleModel
      ? [{ id: compatibleModel, label: compatibleModel, providerMode: "compatible" as const, location: "local" as const }]
      : [])
  ]);

  return {
    providerMode,
    activeModel:
      providerMode === "openai"
        ? openAIModel
        : providerMode === "compatible"
          ? compatibleModel || localModel
          : localModel,
    openAI: {
      configured: Boolean(openAIApiKey && openAIModel),
      model: openAIModel,
      models: openAIModels
    },
    compatible: {
      configured: Boolean(compatibleBaseUrl && compatibleModel),
      baseUrl: compatibleBaseUrl,
      model: compatibleModel,
      models: compatibleModels
    },
    local: {
      model: localModel,
      models: localModels
    }
  };
}
