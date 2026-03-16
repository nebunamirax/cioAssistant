import { beforeEach, describe, expect, it, vi } from "vitest";

const summarizeMock = vi.fn();

vi.mock("@/lib/ai/provider-factory", () => ({
  getAIProvider: vi.fn(() => ({
    summarize: summarizeMock
  }))
}));

describe("meeting-note-draft-service", () => {
  beforeEach(() => {
    summarizeMock.mockReset();
  });

  it("combine synthese IA et extraction heuristique", async () => {
    summarizeMock.mockResolvedValue({
      data: {
        text: "Synthese operationnelle de la reunion. Budget valide, vigilance sur le planning."
      }
    });

    const { generateMeetingNoteDraft } = await import("@/lib/services/meeting-note-draft-service");
    const result = await generateMeetingNoteDraft(`
Codir infra du lundi
Participants: DSI, RSSI, PMO
- Decision: valider le budget securite
- Action: relancer l'editeur avant le 20/04/2026
- Risque: retard fournisseur sur les postes
    `, "2026-04-10T09:00:00.000Z");

    expect(result.suggestedTitle).toContain("Codir infra");
    expect(result.summary).toContain("Synthese operationnelle");
    expect(result.attendees).toEqual(["DSI", "RSSI", "PMO"]);
    expect(result.extractedDecisions).toEqual(["Decision: valider le budget securite"]);
    expect(result.extractedActions).toEqual(["Action: relancer l'editeur avant le 20/04/2026"]);
    expect(result.extractedRisks).toEqual(["Risque: retard fournisseur sur les postes"]);
    expect(result.extractedDeadlines).toEqual(["Action: relancer l'editeur avant le 20/04/2026"]);
  });

  it("retombe sur une synthese heuristique si le provider echoue", async () => {
    summarizeMock.mockRejectedValue(new Error("Provider down"));

    const { generateMeetingNoteDraft } = await import("@/lib/services/meeting-note-draft-service");
    const result = await generateMeetingNoteDraft(`
Point projet ERP
Revue des risques et des prochaines actions.
Le go-live reste confirme.
    `, null);

    expect(result.summary).toContain("Point projet ERP");
    expect(result.summary).toContain("go-live");
  });
});
