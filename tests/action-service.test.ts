import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  action: {
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

describe("action-service", () => {
  beforeEach(() => {
    prismaMock.action.create.mockReset();
    prismaMock.action.delete.mockReset();
    prismaMock.action.findMany.mockReset();
    prismaMock.action.findUnique.mockReset();
    prismaMock.action.update.mockReset();
  });

  it("liste les actions avec les relations attendues", async () => {
    prismaMock.action.findMany.mockResolvedValue([{ id: "a1" }]);

    const { listActions } = await import("@/lib/services/action-service");
    const result = await listActions();

    expect(prismaMock.action.findMany).toHaveBeenCalledWith({
      where: {},
      include: { project: true, contract: true, vendor: true },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }]
    });
    expect(result).toEqual([{ id: "a1" }]);
  });

  it("applique les filtres de recherche et de retard", async () => {
    prismaMock.action.findMany.mockResolvedValue([]);

    const { listActions } = await import("@/lib/services/action-service");
    await listActions({
      search: "lot",
      status: "TODO",
      priority: "HIGH",
      overdueOnly: true
    });

    expect(prismaMock.action.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [
                { title: { contains: "lot" } },
                { description: { contains: "lot" } }
              ]
            },
            { status: "TODO" },
            { priority: "HIGH" },
            { dueDate: { lt: expect.any(Date) } },
            { status: { not: "DONE" } }
          ]
        }
      })
    );
  });

  it("cree une action avec date convertie et description normalisee", async () => {
    prismaMock.action.create.mockResolvedValue({ id: "a1" });

    const { createAction } = await import("@/lib/services/action-service");
    await createAction({
      title: "Preparer le lot 1",
      dueDate: "2026-03-15T10:00:00.000Z"
    });

    expect(prismaMock.action.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.action.create.mock.calls[0]?.[0]).toEqual({
      data: {
        title: "Preparer le lot 1",
        completedAt: null,
        status: "TODO",
        priority: "NORMAL",
        dueDate: new Date("2026-03-15T10:00:00.000Z"),
        description: null
      }
    });
  });

  it("met a jour une action et renseigne completedAt quand le statut passe a DONE", async () => {
    prismaMock.action.update.mockResolvedValue({ id: "a1" });

    const { updateAction } = await import("@/lib/services/action-service");
    await updateAction("a1", {
      status: "DONE",
      description: ""
    });

    expect(prismaMock.action.update).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: {
        completedAt: expect.any(Date),
        description: null,
        status: "DONE"
      }
    });
  });

  it("supprime une action par identifiant", async () => {
    prismaMock.action.delete.mockResolvedValue({ id: "a1" });

    const { deleteAction } = await import("@/lib/services/action-service");
    await deleteAction("a1");

    expect(prismaMock.action.delete).toHaveBeenCalledWith({
      where: { id: "a1" }
    });
  });
});
