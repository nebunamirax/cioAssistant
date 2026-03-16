import { getAIProvider } from "@/lib/ai/provider-factory";
import { appSettingsSchema, type AppSettings } from "@/lib/settings/schema";

export type SettingsTestStatus = "success" | "warning" | "error";

export type SettingsTestItem = {
  scope: "ai" | "outlook" | "notion";
  status: SettingsTestStatus;
  title: string;
  message: string;
  details?: string[];
};

export type SettingsTestScope = SettingsTestItem["scope"];

async function testAI(settings: AppSettings): Promise<SettingsTestItem> {
  try {
    if (settings.ai.providerMode === "local" && settings.ai.localModel.trim() !== "heuristic-v1") {
      return {
        scope: "ai",
        status: "error",
        title: "Configuration IA locale invalide",
        message: "Le mode local natif ne supporte que heuristic-v1. Pour un vrai modèle local, utilise le mode OpenAI-compatible.",
        details: [`Modèle demandé: ${settings.ai.localModel.trim()}`]
      };
    }

    if (settings.ai.providerMode === "openai" && !settings.ai.openAIApiKey.trim()) {
      return {
        scope: "ai",
        status: "error",
        title: "Configuration IA invalide",
        message: "La clé API OpenAI est absente."
      };
    }

    if (settings.ai.providerMode === "openai" && !settings.ai.openAIModel.trim()) {
      return {
        scope: "ai",
        status: "error",
        title: "Configuration IA invalide",
        message: "Le modèle OpenAI actif est absent."
      };
    }

    if (settings.ai.providerMode === "compatible" && !settings.ai.compatibleBaseUrl.trim()) {
      return {
        scope: "ai",
        status: "error",
        title: "Configuration IA invalide",
        message: "La base URL du provider compatible est absente."
      };
    }

    if (settings.ai.providerMode === "compatible" && !settings.ai.compatibleModel.trim()) {
      return {
        scope: "ai",
        status: "error",
        title: "Configuration IA invalide",
        message: "Le modèle compatible actif est absent."
      };
    }

    const provider = getAIProvider(settings);
    const connectionTest = await provider.testConnection();

    if (!connectionTest.ok) {
      return {
        scope: "ai",
        status: "error",
        title: "Échec du test IA",
        message: connectionTest.message,
        details: [
          ...(connectionTest.statusCode ? [`Code HTTP: ${connectionTest.statusCode}`] : []),
          ...(connectionTest.responsePreview ? [`Réponse: ${connectionTest.responsePreview}`] : [])
        ]
      };
    }

    return {
      scope: "ai",
      status: "success",
      title: "Configuration IA valide",
      message: `Provider ${provider.info.label} joignable avec le modèle ${provider.info.model}.`,
      details: [
        ...(connectionTest.statusCode ? [`Code HTTP: ${connectionTest.statusCode}`] : []),
        ...(connectionTest.responsePreview ? [`Réponse: ${connectionTest.responsePreview}`] : [])
      ]
    };
  } catch (error) {
    return {
      scope: "ai",
      status: "error",
      title: "Échec du test IA",
      message: (error as Error).message
    };
  }
}

function testOutlook(settings: AppSettings): SettingsTestItem {
  if (!settings.integrations.outlookEnabled) {
    return {
      scope: "outlook",
      status: "warning",
      title: "Outlook désactivé",
      message: "L’intégration Outlook n’est pas activée."
    };
  }

  const missing = [
    !settings.integrations.outlookTenantId.trim() ? "Tenant ID manquant" : null,
    !settings.integrations.outlookClientId.trim() ? "Client ID manquant" : null
  ].filter(Boolean) as string[];

  if (missing.length > 0) {
    return {
      scope: "outlook",
      status: "error",
      title: "Configuration Outlook incomplète",
      message: "Les champs requis ne sont pas tous renseignés.",
      details: missing
    };
  }

  return {
    scope: "outlook",
    status: "warning",
    title: "Configuration Outlook plausible",
    message: "Les champs requis sont présents, mais aucun test OAuth/Graph n’est encore implémenté."
  };
}

function testNotion(settings: AppSettings): SettingsTestItem {
  if (!settings.integrations.notionEnabled) {
    return {
      scope: "notion",
      status: "warning",
      title: "Notion désactivé",
      message: "L’intégration Notion n’est pas activée."
    };
  }

  const missing = [
    !settings.integrations.notionApiKey.trim() ? "API key manquante" : null,
    !settings.integrations.notionDatabaseId.trim() ? "Database ID manquant" : null
  ].filter(Boolean) as string[];

  if (missing.length > 0) {
    return {
      scope: "notion",
      status: "error",
      title: "Configuration Notion incomplète",
      message: "Les champs requis ne sont pas tous renseignés.",
      details: missing
    };
  }

  return {
    scope: "notion",
    status: "warning",
    title: "Configuration Notion plausible",
    message: "Les champs requis sont présents, mais aucun test API Notion n’est encore implémenté."
  };
}

export async function runSettingsTest(rawSettings: unknown, scope?: SettingsTestScope) {
  const settings = appSettingsSchema.parse(rawSettings);
  const results = await (async () => {
    if (scope === "ai") return [await testAI(settings)];
    if (scope === "outlook") return [testOutlook(settings)];
    if (scope === "notion") return [testNotion(settings)];
    return [await testAI(settings), testOutlook(settings), testNotion(settings)];
  })();

  return {
    status: results.some((item) => item.status === "error")
      ? "error"
      : results.some((item) => item.status === "warning")
        ? "warning"
        : "success",
    results
  };
}
