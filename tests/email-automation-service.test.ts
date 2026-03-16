import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  email: {
    findMany: vi.fn(),
    update: vi.fn()
  }
};

const loadAppSettingsSyncMock = vi.fn();
const ingestAIIntakeMock = vi.fn();
const syncInboxEmailsMock = vi.fn();
const getOutlookConnectionStatusMock = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock
}));

vi.mock("@/lib/settings/service", () => ({
  loadAppSettingsSync: loadAppSettingsSyncMock
}));

vi.mock("@/lib/services/ai-intake-service", () => ({
  ingestAIIntake: ingestAIIntakeMock
}));

vi.mock("@/lib/services/email-service", () => ({
  syncInboxEmails: syncInboxEmailsMock
}));

vi.mock("@/lib/integrations/outlook", () => ({
  getOutlookConnectionStatus: getOutlookConnectionStatusMock
}));

describe("email-automation-service", () => {
  beforeEach(() => {
    prismaMock.email.findMany.mockReset();
    prismaMock.email.update.mockReset();
    loadAppSettingsSyncMock.mockReset();
    ingestAIIntakeMock.mockReset();
    syncInboxEmailsMock.mockReset();
    getOutlookConnectionStatusMock.mockReset();

    loadAppSettingsSyncMock.mockReturnValue({
      ai: {},
      integrations: {
        outlookEnabled: true,
        outlookPollingEnabled: true,
        outlookPollingIntervalMinutes: 15,
        outlookAutomationEnabled: true,
        outlookAutomationCategory: "assistant"
      }
    });
    getOutlookConnectionStatusMock.mockReturnValue({
      connected: true,
      lastSyncedAt: null
    });
  });

  it("normalise les categories configurees et detecte un match email", async () => {
    const { parseAutomationCategories, emailMatchesAutomationCategory } = await import("@/lib/services/email-automation-service");

    expect(parseAutomationCategories("assistant, Prioritaire ,assistant")).toEqual(["assistant", "prioritaire"]);
    expect(emailMatchesAutomationCategory(["Blue", "Assistant"], ["assistant"])).toBe(true);
    expect(emailMatchesAutomationCategory(["Blue"], ["assistant"])).toBe(false);
  });

  it("ignore les emails hors categorie et cree une revue pour les emails matches", async () => {
    prismaMock.email.findMany.mockResolvedValue([
      {
        id: "e-ignore",
        subject: "Newsletter",
        fromEmail: "news@example.com",
        snippet: "RAS",
        receivedAt: new Date("2026-03-16T10:00:00.000Z"),
        categoriesJson: JSON.stringify(["Finance"]),
        automationStatus: "PENDING"
      },
      {
        id: "e-review",
        subject: "Assistant - contrat fournisseur",
        fromEmail: "buyer@example.com",
        snippet: "Merci de verifier le contrat et la date de fin.",
        receivedAt: new Date("2026-03-16T10:05:00.000Z"),
        categoriesJson: JSON.stringify(["Assistant"]),
        automationStatus: "PENDING"
      }
    ]);
    ingestAIIntakeMock.mockResolvedValue({
      disposition: "review",
      sourceName: "email:Assistant - contrat fournisseur",
      provider: {
        provider: "compatible",
        label: "Compatible",
        mode: "compatible",
        model: "model-x",
        location: "local"
      },
      summary: "Contrat detecte.",
      modules: ["contracts"],
      reviewId: "rev-1",
      reviewReason: "Validation humaine requise.",
      selectedModule: "contracts"
    });

    const { processAutomatedEmails } = await import("@/lib/services/email-automation-service");
    const result = await processAutomatedEmails(10);

    expect(prismaMock.email.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "e-ignore" },
      data: expect.objectContaining({
        automationStatus: "IGNORED"
      })
    }));
    expect(ingestAIIntakeMock).toHaveBeenCalledWith(expect.objectContaining({
      sourceName: "email:Assistant - contrat fournisseur"
    }));
    expect(prismaMock.email.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "e-review" },
      data: expect.objectContaining({
        automationStatus: "REVIEW"
      })
    }));
    expect(result).toEqual({
      processedCount: 2,
      createdCount: 0,
      reviewCount: 1,
      ignoredCount: 1,
      failedCount: 0
    });
  });

  it("synchronise puis automatise en une seule passe", async () => {
    syncInboxEmailsMock.mockResolvedValue({ syncedCount: 3 });
    prismaMock.email.findMany.mockResolvedValue([]);

    const { syncAndProcessInboxEmails } = await import("@/lib/services/email-automation-service");
    const result = await syncAndProcessInboxEmails(25);

    expect(syncInboxEmailsMock).toHaveBeenCalledWith(25);
    expect(result).toEqual({
      syncedCount: 3,
      processedCount: 0,
      createdCount: 0,
      reviewCount: 0,
      ignoredCount: 0,
      failedCount: 0
    });
  });
});
