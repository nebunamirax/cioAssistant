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
    expect(result.extractedActions).toEqual([
      {
        title: "relancer l'editeur",
        ownerName: null,
        dueDate: "2026-04-20T09:00:00.000Z",
        notes: "Action: relancer l'editeur avant le 20/04/2026",
        createdActionId: null
      }
    ]);
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

  it("extrait des actions depuis un compte-rendu en langage naturel", async () => {
    summarizeMock.mockResolvedValue({
      data: {
        text: "Synthese de suivi."
      }
    });

    const { generateMeetingNoteDraft } = await import("@/lib/services/meeting-note-draft-service");
    const result = await generateMeetingNoteDraft(`
Reunion de pilotage CRM
Participants: Max Martin, Lea Durand
Max Martin doit relancer l'editeur avant le 20/04/2026.
Il faut preparer le support comite projet.
Risque: retard sur la reprise de donnees.
    `, "2026-04-10T09:00:00.000Z");

    expect(result.extractedActions).toEqual([
      {
        title: "relancer l'editeur",
        ownerName: "Max Martin",
        dueDate: "2026-04-20T09:00:00.000Z",
        notes: "Max Martin doit relancer l'editeur avant le 20/04/2026.",
        createdActionId: null
      },
      {
        title: "preparer le support comite projet",
        ownerName: null,
        dueDate: null,
        notes: "Il faut preparer le support comite projet.",
        createdActionId: null
      }
    ]);
  });

  it("ignore les timestamps de transcription et reconnait une echeance en francais", async () => {
    summarizeMock.mockResolvedValue({
      data: {
        text: "Synthese de reunion."
      }
    });

    const { generateMeetingNoteDraft } = await import("@/lib/services/meeting-note-draft-service");
    const result = await generateMeetingNoteDraft(`
00:00:00.000 00:00:05.000 Voici une note vocale par rapport a la reunion d'aujourd'hui.
00:00:10.000 Maxime doit faire une action le 27 septembre 2016.
    `, "2026-03-16T09:00:00.000Z");

    expect(result.extractedActions).toEqual([
      {
        title: "faire une action",
        ownerName: "Maxime",
        dueDate: "2016-09-27T09:00:00.000Z",
        notes: "Maxime doit faire une action le 27 septembre 2016.",
        createdActionId: null
      }
    ]);
    expect(result.extractedDeadlines).toEqual(["Maxime doit faire une action le 27 septembre 2016."]);
  });
});
