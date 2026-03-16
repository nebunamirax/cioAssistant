import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  aIIntakeReview: {
    findUnique: vi.fn(),
    update: vi.fn()
  }
};

const providerMock = {
  info: {
    provider: "compatible",
    label: "OpenAI-compatible endpoint",
    mode: "compatible",
    model: "mistralai/devstral-small-2507",
    location: "local" as const
  },
  analyzeIntake: vi.fn(),
  suggestDraft: vi.fn(),
  testConnection: vi.fn(),
  summarize: vi.fn(),
  extract: vi.fn(),
  classify: vi.fn(),
  suggestProject: vi.fn()
};

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock
}));

vi.mock("@/lib/ai/provider-factory", () => ({
  getAIProvider: vi.fn(() => providerMock)
}));

describe("ai-intake-review-service", () => {
  beforeEach(() => {
    prismaMock.aIIntakeReview.findUnique.mockReset();
    prismaMock.aIIntakeReview.update.mockReset();
    providerMock.suggestDraft.mockReset();

    prismaMock.aIIntakeReview.findUnique.mockResolvedValue({
      id: "review-1",
      sourceName: null,
      rawText: "Hello Max,\n\nTu pourrais me changer mon pc le 28/07/2026 ?\n\nMerci !",
      providerMode: "compatible",
      providerLabel: "OpenAI-compatible endpoint",
      providerModel: "mistralai/devstral-small-2507",
      summary: "Demande de changement de poste de travail",
      suggestedModulesJson: "[]",
      analysisJson: null,
      status: "PENDING",
      reviewReason: "Routage ambigu.",
      selectedModule: null,
      draftDataJson: null,
      createdEntityType: null,
      createdEntityId: null,
      createdEntityHref: null,
      reviewedAt: null,
      createdAt: new Date("2026-03-15T10:00:00.000Z"),
      updatedAt: new Date("2026-03-15T10:00:00.000Z")
    });

    prismaMock.aIIntakeReview.update.mockImplementation(async ({ data }) => ({
      id: "review-1",
      sourceName: null,
      rawText: "Hello Max,\n\nTu pourrais me changer mon pc le 28/07/2026 ?\n\nMerci !",
      providerMode: "compatible",
      providerLabel: "OpenAI-compatible endpoint",
      providerModel: "mistralai/devstral-small-2507",
      summary: "Demande de changement de poste de travail",
      suggestedModulesJson: "[]",
      analysisJson: null,
      status: "PENDING",
      reviewReason: "Routage ambigu.",
      selectedModule: data.selectedModule ?? "actions",
      draftDataJson: data.draftDataJson ?? null,
      createdEntityType: null,
      createdEntityId: null,
      createdEntityHref: null,
      reviewedAt: null,
      createdAt: new Date("2026-03-15T10:00:00.000Z"),
      updatedAt: new Date("2026-03-15T10:00:00.000Z")
    }));
  });

  it("préremplit un brouillon ciblé sur le module choisi avec un second call IA", async () => {
    providerMock.suggestDraft.mockResolvedValue({
      title: "Changer le PC de Max",
      dueDate: "2026-07-28T09:00:00.000Z"
    });

    const { suggestAIIntakeReviewDraft } = await import("@/lib/services/ai-intake-review-service");
    const result = await suggestAIIntakeReviewDraft("review-1", "actions");

    expect(providerMock.suggestDraft).toHaveBeenCalledWith("actions", expect.objectContaining({
      text: expect.stringContaining("28/07/2026")
    }));
    expect(result.review.draftData).toEqual(expect.objectContaining({
      title: "Changer le PC de Max",
      dueDate: "2026-07-28T09:00:00.000Z",
      status: "TODO",
      priority: "NORMAL"
    }));
    expect(result.suggestion.usedFallback).toBe(false);
  });
});
