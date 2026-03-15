import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  project: {
    create: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn()
  }
};

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock
}));

describe("project-service", () => {
  beforeEach(() => {
    prismaMock.project.create.mockReset();
    prismaMock.project.delete.mockReset();
    prismaMock.project.findMany.mockReset();
    prismaMock.project.findUnique.mockReset();
    prismaMock.project.update.mockReset();
  });

  it("liste les projets avec compteurs", async () => {
    prismaMock.project.findMany.mockResolvedValue([{ id: "p1" }]);

    const { listProjects } = await import("@/lib/services/project-service");
    const result = await listProjects();

    expect(prismaMock.project.findMany).toHaveBeenCalledWith({
      where: {},
      include: {
        _count: {
          select: {
            actions: true,
            contracts: true,
            budgetItems: true,
            communications: true,
            meetingNotes: true
          }
        }
      },
      orderBy: [{ targetDate: "asc" }, { createdAt: "desc" }]
    });
    expect(result).toEqual([{ id: "p1" }]);
  });

  it("applique les filtres de recherche et type", async () => {
    prismaMock.project.findMany.mockResolvedValue([]);

    const { listProjects } = await import("@/lib/services/project-service");
    await listProjects({
      search: "ERP",
      type: "MIGRATION",
      status: "ACTIVE",
      priority: "HIGH"
    });

    expect(prismaMock.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [
                { title: { contains: "ERP" } },
                { description: { contains: "ERP" } }
              ]
            },
            { type: "MIGRATION" },
            { status: "ACTIVE" },
            { priority: "HIGH" }
          ]
        }
      })
    );
  });

  it("cree un projet avec dates converties", async () => {
    prismaMock.project.create.mockResolvedValue({ id: "p1" });

    const { createProject } = await import("@/lib/services/project-service");
    await createProject({
      title: "Migration ERP",
      type: "MIGRATION",
      startDate: "2026-03-15T10:00:00.000Z"
    });

    expect(prismaMock.project.create).toHaveBeenCalledWith({
      data: {
        title: "Migration ERP",
        description: null,
        type: "MIGRATION",
        status: "DRAFT",
        priority: "NORMAL",
        ownerId: undefined,
        startDate: new Date("2026-03-15T10:00:00.000Z"),
        targetDate: null
      }
    });
  });

  it("met a jour un projet", async () => {
    prismaMock.project.update.mockResolvedValue({ id: "p1" });

    const { updateProject } = await import("@/lib/services/project-service");
    await updateProject("p1", {
      status: "ACTIVE",
      description: ""
    });

    expect(prismaMock.project.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: {
        description: null,
        status: "ACTIVE"
      }
    });
  });

  it("supprime un projet", async () => {
    prismaMock.project.delete.mockResolvedValue({ id: "p1" });

    const { deleteProject } = await import("@/lib/services/project-service");
    await deleteProject("p1");

    expect(prismaMock.project.delete).toHaveBeenCalledWith({
      where: { id: "p1" }
    });
  });
});
