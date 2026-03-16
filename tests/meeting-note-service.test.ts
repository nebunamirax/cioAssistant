import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  meetingNote: {
    create: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn()
  }
};

const createActionMock = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock
}));

vi.mock("@/lib/services/action-service", () => ({
  createAction: createActionMock
}));

describe("meeting-note-service", () => {
  beforeEach(() => {
    prismaMock.meetingNote.create.mockReset();
    prismaMock.meetingNote.delete.mockReset();
    prismaMock.meetingNote.findMany.mockReset();
    prismaMock.meetingNote.findUnique.mockReset();
    prismaMock.meetingNote.update.mockReset();
    createActionMock.mockReset();
  });

  it("liste les notes de reunion avec projet et tableaux hydratés", async () => {
    prismaMock.meetingNote.findMany.mockResolvedValue([
      {
        id: "m1",
        attendeesJson: "[\"DSI\",\"RSSI\"]",
        extractedActionsJson: "[\"Relancer l'editeur\"]",
        extractedDecisionsJson: "[\"Valider le budget\"]",
        extractedRisksJson: "[\"Derive planning\"]",
        extractedDeadlinesJson: "[\"2026-04-15\"]",
        project: { id: "p1", title: "ERP" }
      }
    ]);

    const { listMeetingNotes } = await import("@/lib/services/meeting-note-service");
    const result = await listMeetingNotes();

    expect(prismaMock.meetingNote.findMany).toHaveBeenCalledWith({
      where: {},
      include: {
        project: true
      },
      orderBy: [{ meetingDate: "desc" }, { createdAt: "desc" }]
    });
    expect(result).toEqual([
      expect.objectContaining({
        id: "m1",
        attendees: ["DSI", "RSSI"],
        extractedActions: [{ title: "Relancer l'editeur", ownerName: null, dueDate: null, notes: "Relancer l'editeur", createdActionId: null }],
        extractedDecisions: ["Valider le budget"],
        extractedRisks: ["Derive planning"],
        extractedDeadlines: ["2026-04-15"]
      })
    ]);
  });

  it("applique les filtres de recherche et projet", async () => {
    prismaMock.meetingNote.findMany.mockResolvedValue([]);

    const { listMeetingNotes } = await import("@/lib/services/meeting-note-service");
    await listMeetingNotes({
      search: "codir",
      projectId: "p1"
    });

    expect(prismaMock.meetingNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [
                { title: { contains: "codir" } },
                { rawContent: { contains: "codir" } },
                { summary: { contains: "codir" } }
              ]
            },
            { projectId: "p1" }
          ]
        }
      })
    );
  });

  it("cree une note de reunion en serialisant les tableaux", async () => {
    prismaMock.meetingNote.create.mockResolvedValue({
      id: "m1",
      attendeesJson: "[]",
      extractedActionsJson: "[]",
      extractedDecisionsJson: "[]",
      extractedRisksJson: "[]",
      extractedDeadlinesJson: "[]"
    });

    const { createMeetingNote } = await import("@/lib/services/meeting-note-service");
    await createMeetingNote({
      projectId: "",
      title: "Codir",
      meetingDate: "2026-03-16T09:00:00.000Z",
      attendees: ["DSI", "RSSI"],
      rawContent: "Compte-rendu brut",
      summary: "",
      extractedActions: [{ title: "Faire le point budget", ownerName: "Max", dueDate: null, notes: "Faire le point budget", createdActionId: null }],
      extractedDecisions: [],
      extractedRisks: ["Retard fournisseur"],
      extractedDeadlines: ["2026-03-20"]
    });

    expect(prismaMock.meetingNote.create).toHaveBeenCalledWith({
      data: {
        projectId: null,
        title: "Codir",
        meetingDate: new Date("2026-03-16T09:00:00.000Z"),
        attendeesJson: JSON.stringify(["DSI", "RSSI"]),
        rawContent: "Compte-rendu brut",
        summary: null,
        extractedActionsJson: JSON.stringify([{ title: "Faire le point budget", ownerName: "Max", dueDate: null, notes: "Faire le point budget", createdActionId: null }]),
        extractedDecisionsJson: JSON.stringify([]),
        extractedRisksJson: JSON.stringify(["Retard fournisseur"]),
        extractedDeadlinesJson: JSON.stringify(["2026-03-20"])
      }
    });
  });

  it("met a jour une note de reunion", async () => {
    prismaMock.meetingNote.update.mockResolvedValue({
      id: "m1",
      attendeesJson: "[]",
      extractedActionsJson: "[]",
      extractedDecisionsJson: "[]",
      extractedRisksJson: "[]",
      extractedDeadlinesJson: "[]",
      project: null
    });

    const { updateMeetingNote } = await import("@/lib/services/meeting-note-service");
    await updateMeetingNote("m1", {
      summary: "",
      extractedDecisions: ["Go no-go confirme"]
    });

    expect(prismaMock.meetingNote.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: {
        summary: null,
        extractedDecisionsJson: JSON.stringify(["Go no-go confirme"])
      },
      include: {
        project: true
      }
    });
  });

  it("supprime une note de reunion", async () => {
    prismaMock.meetingNote.delete.mockResolvedValue({ id: "m1" });

    const { deleteMeetingNote } = await import("@/lib/services/meeting-note-service");
    await deleteMeetingNote("m1");

    expect(prismaMock.meetingNote.delete).toHaveBeenCalledWith({
      where: { id: "m1" }
    });
  });

  it("cree les actions depuis une reunion et marque les brouillons comme crees", async () => {
    prismaMock.meetingNote.findUnique.mockResolvedValueOnce({
      id: "m1",
      projectId: "p1",
      title: "Codir",
      meetingDate: new Date("2026-03-16T09:00:00.000Z"),
      attendeesJson: "[]",
      rawContent: "Compte-rendu brut",
      summary: "Synthese",
      extractedActionsJson: JSON.stringify([
        { title: "Relancer l'editeur", ownerName: "Max", dueDate: "2026-04-20T09:00:00.000Z", notes: "Action prioritaire", createdActionId: null }
      ]),
      extractedDecisionsJson: "[]",
      extractedRisksJson: "[]",
      extractedDeadlinesJson: "[]",
      project: { id: "p1", title: "ERP" }
    });
    createActionMock.mockResolvedValueOnce({ id: "a1", title: "Relancer l'editeur" });
    prismaMock.meetingNote.update.mockResolvedValueOnce({
      id: "m1",
      attendeesJson: "[]",
      extractedActionsJson: JSON.stringify([
        { title: "Relancer l'editeur", ownerName: "Max", dueDate: "2026-04-20T09:00:00.000Z", notes: "Action prioritaire", createdActionId: "a1" }
      ]),
      extractedDecisionsJson: "[]",
      extractedRisksJson: "[]",
      extractedDeadlinesJson: "[]",
      project: { id: "p1", title: "ERP" }
    });

    const { createActionsFromMeetingNote } = await import("@/lib/services/meeting-note-service");
    const result = await createActionsFromMeetingNote("m1");

    expect(createActionMock).toHaveBeenCalledWith({
      title: "Relancer l'editeur",
      description: "Action prioritaire",
      ownerName: "Max",
      dueDate: "2026-04-20T09:00:00.000Z",
      status: "TODO",
      priority: "NORMAL",
      projectId: "p1",
      sourceType: "MEETING_NOTE",
      sourceRef: "meeting-note:m1"
    });
    expect(result.createdActions).toEqual([{ id: "a1", title: "Relancer l'editeur" }]);
    expect(prismaMock.meetingNote.update).toHaveBeenCalled();
  });
});
