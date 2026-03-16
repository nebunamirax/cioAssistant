import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  communication: {
    create: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn()
  },
  project: {
    findUnique: vi.fn()
  },
  action: {
    findUnique: vi.fn()
  },
  contract: {
    findUnique: vi.fn()
  }
};

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock
}));

describe("communication-service", () => {
  beforeEach(() => {
    prismaMock.communication.create.mockReset();
    prismaMock.communication.delete.mockReset();
    prismaMock.communication.findMany.mockReset();
    prismaMock.communication.findUnique.mockReset();
    prismaMock.communication.update.mockReset();
    prismaMock.project.findUnique.mockReset();
    prismaMock.action.findUnique.mockReset();
    prismaMock.contract.findUnique.mockReset();
    prismaMock.project.findUnique.mockResolvedValue(null);
    prismaMock.action.findUnique.mockResolvedValue(null);
    prismaMock.contract.findUnique.mockResolvedValue(null);
  });

  it("liste les communications avec les relations attendues", async () => {
    prismaMock.communication.findMany.mockResolvedValue([{ id: "c1" }]);

    const { listCommunications } = await import("@/lib/services/communication-service");
    const result = await listCommunications();

    expect(prismaMock.communication.findMany).toHaveBeenCalledWith({
      where: {},
      include: {
        project: true,
        action: true,
        contract: true
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
    });
    expect(result).toEqual([{ id: "c1", templateInputData: null }]);
  });

  it("applique les filtres de recherche et de rattachement", async () => {
    prismaMock.communication.findMany.mockResolvedValue([]);

    const { listCommunications } = await import("@/lib/services/communication-service");
    await listCommunications({
      search: "pilotage",
      status: "READY",
      type: "email",
      projectId: "p1",
      actionId: "a1",
      contractId: "ct1"
    });

    expect(prismaMock.communication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [
                { title: { contains: "pilotage" } },
                { contentText: { contains: "pilotage" } },
                { contentMarkdown: { contains: "pilotage" } }
              ]
            },
            { status: "READY" },
            { type: { contains: "email" } },
            { projectId: "p1" },
            { actionId: "a1" },
            { contractId: "ct1" }
          ]
        }
      })
    );
  });

  it("cree une communication en normalisant les champs vides", async () => {
    prismaMock.communication.create.mockResolvedValue({ id: "c1" });

    const { createCommunication } = await import("@/lib/services/communication-service");
    await createCommunication({
      title: "Synthese comex",
      status: "DRAFT",
      type: "",
      contentText: "",
      projectId: ""
    });

    expect(prismaMock.communication.create).toHaveBeenCalledWith({
      data: {
        title: "Synthese comex",
        type: null,
        status: "DRAFT",
        contentText: null,
        projectId: null
      }
    });
  });

  it("genere automatiquement le contenu a partir du template", async () => {
    prismaMock.communication.create.mockResolvedValue({ id: "c2" });

    const { createCommunication } = await import("@/lib/services/communication-service");
    await createCommunication({
      title: "",
      status: "DRAFT",
      templateKey: "PROJECT_PROGRESS",
      templateInputData: {
        projectName: "Refonte intranet",
        reportingPeriod: "Mars 2026",
        overallStatus: "Sous controle"
      }
    });

    expect(prismaMock.communication.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        templateKey: "PROJECT_PROGRESS",
        type: "project-update",
        inputDataJson: JSON.stringify({
          projectName: "Refonte intranet",
          reportingPeriod: "Mars 2026",
          overallStatus: "Sous controle"
        }),
        title: "Synthese avancement - Refonte intranet (Mars 2026)"
      })
    });
  });

  it("met a jour une communication", async () => {
    prismaMock.communication.update.mockResolvedValue({ id: "c1" });

    const { updateCommunication } = await import("@/lib/services/communication-service");
    await updateCommunication("c1", {
      status: "SENT",
      contentMarkdown: ""
    });

    expect(prismaMock.communication.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: {
        status: "SENT",
        contentMarkdown: null
      }
    });
  });

  it("supprime une communication par identifiant", async () => {
    prismaMock.communication.delete.mockResolvedValue({ id: "c1" });

    const { deleteCommunication } = await import("@/lib/services/communication-service");
    await deleteCommunication("c1");

    expect(prismaMock.communication.delete).toHaveBeenCalledWith({
      where: { id: "c1" }
    });
  });
});
