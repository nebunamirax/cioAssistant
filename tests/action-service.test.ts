import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  action: {
    create: vi.fn(),
    findMany: vi.fn()
  }
};

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock
}));

describe("action-service", () => {
  beforeEach(() => {
    prismaMock.action.create.mockReset();
    prismaMock.action.findMany.mockReset();
  });

  it("liste les actions avec les relations attendues", async () => {
    prismaMock.action.findMany.mockResolvedValue([{ id: "a1" }]);

    const { listActions } = await import("@/lib/services/action-service");
    const result = await listActions();

    expect(prismaMock.action.findMany).toHaveBeenCalledWith({
      include: { project: true, contract: true, vendor: true },
      orderBy: { createdAt: "desc" }
    });
    expect(result).toEqual([{ id: "a1" }]);
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
        status: "TODO",
        priority: "NORMAL",
        dueDate: new Date("2026-03-15T10:00:00.000Z"),
        description: null
      }
    });
  });
});
