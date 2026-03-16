import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/provider-factory", () => ({
  getAIProvider: vi.fn(() => ({
    info: {
      provider: "local",
      label: "Heuristic local router",
      mode: "local",
      model: "heuristic-v1",
      location: "local"
    },
    testConnection: vi.fn(async () => ({
      ok: false,
      message: "Aucun appel réseau possible: heuristic-v1 est un fallback local non connecté à un modèle IA réel."
    })),
    analyzeIntake: vi.fn(),
    suggestDraft: vi.fn(async () => ({}))
  }))
}));

describe("settings-test-service", () => {
  it("signale qu'aucune IA reelle n'est configuree en local par defaut", async () => {
    const { runSettingsTest } = await import("@/lib/settings/test-service");
    const result = await runSettingsTest({
      ai: {
        providerMode: "local",
        localModel: "heuristic-v1",
        localModels: "heuristic-v1",
        openAIApiKey: "",
        openAIModel: "",
        openAIModels: "",
        compatibleBaseUrl: "",
        compatibleApiKey: "",
        compatibleModel: "",
        compatibleModels: ""
      },
      integrations: {
        outlookEnabled: false,
        outlookTenantId: "",
        outlookClientId: "",
        outlookClientSecret: "",
        outlookPollingEnabled: false,
        outlookPollingIntervalMinutes: 15,
        outlookAutomationEnabled: false,
        outlookAutomationCategory: "assistant",
        notionEnabled: false,
        notionApiKey: "",
        notionDatabaseId: ""
      }
    }, "ai");

    expect(result.status).toBe("error");
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toEqual(
      expect.objectContaining({ status: "error" })
    );
  });

  it("signale une configuration OpenAI incomplète", async () => {
    const { runSettingsTest } = await import("@/lib/settings/test-service");
    const result = await runSettingsTest({
      ai: {
        providerMode: "openai",
        localModel: "heuristic-v1",
        localModels: "heuristic-v1",
        openAIApiKey: "",
        openAIModel: "",
        openAIModels: "",
        compatibleBaseUrl: "",
        compatibleApiKey: "",
        compatibleModel: "",
        compatibleModels: ""
      },
      integrations: {
        outlookEnabled: false,
        outlookTenantId: "",
        outlookClientId: "",
        outlookClientSecret: "",
        outlookPollingEnabled: false,
        outlookPollingIntervalMinutes: 15,
        outlookAutomationEnabled: false,
        outlookAutomationCategory: "assistant",
        notionEnabled: false,
        notionApiKey: "",
        notionDatabaseId: ""
      }
    }, "ai");

    expect(result.results[0]).toEqual(
      expect.objectContaining({ status: "error" })
    );
  });

  it("refuse un modele non supporte en mode local natif", async () => {
    const { runSettingsTest } = await import("@/lib/settings/test-service");
    const result = await runSettingsTest({
      ai: {
        providerMode: "local",
        localModel: "llama3.1:8b",
        localModels: "heuristic-v1,llama3.1:8b",
        openAIApiKey: "",
        openAIModel: "",
        openAIModels: "",
        compatibleBaseUrl: "",
        compatibleApiKey: "",
        compatibleModel: "",
        compatibleModels: ""
      },
      integrations: {
        outlookEnabled: false,
        outlookTenantId: "",
        outlookClientId: "",
        outlookClientSecret: "",
        outlookPollingEnabled: false,
        outlookPollingIntervalMinutes: 15,
        outlookAutomationEnabled: false,
        outlookAutomationCategory: "assistant",
        notionEnabled: false,
        notionApiKey: "",
        notionDatabaseId: ""
      }
    }, "ai");

    expect(result.status).toBe("error");
    expect(result.results[0]).toEqual(
      expect.objectContaining({ status: "error" })
    );
  });
});
