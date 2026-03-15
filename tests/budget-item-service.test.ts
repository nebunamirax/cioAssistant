import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  budgetItem: {
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

describe("budget-item-service", () => {
  beforeEach(() => {
    prismaMock.budgetItem.create.mockReset();
    prismaMock.budgetItem.delete.mockReset();
    prismaMock.budgetItem.findMany.mockReset();
    prismaMock.budgetItem.findUnique.mockReset();
    prismaMock.budgetItem.update.mockReset();
  });

  it("liste les lignes budgetaires avec relations", async () => {
    prismaMock.budgetItem.findMany.mockResolvedValue([{ id: "b1" }]);

    const { listBudgetItems } = await import("@/lib/services/budget-item-service");
    const result = await listBudgetItems();

    expect(prismaMock.budgetItem.findMany).toHaveBeenCalledWith({
      where: {},
      include: {
        project: true,
        contract: true,
        vendor: true
      },
      orderBy: [{ fiscalYear: "desc" }, { createdAt: "desc" }]
    });
    expect(result).toEqual([{ id: "b1" }]);
  });

  it("applique les filtres de recherche", async () => {
    prismaMock.budgetItem.findMany.mockResolvedValue([]);

    const { listBudgetItems } = await import("@/lib/services/budget-item-service");
    await listBudgetItems({
      search: "licence",
      category: "Software",
      fiscalYear: 2026
    });

    expect(prismaMock.budgetItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [
                { title: { contains: "licence" } },
                { category: { contains: "licence" } },
                { notes: { contains: "licence" } }
              ]
            },
            { category: { contains: "Software" } },
            { fiscalYear: 2026 }
          ]
        }
      })
    );
  });

  it("cree une ligne budgetaire", async () => {
    prismaMock.budgetItem.create.mockResolvedValue({ id: "b1" });

    const { createBudgetItem } = await import("@/lib/services/budget-item-service");
    await createBudgetItem({
      title: "Licences 2026",
      plannedAmount: 10000
    });

    expect(prismaMock.budgetItem.create).toHaveBeenCalledWith({
      data: {
        title: "Licences 2026",
        category: null,
        projectId: undefined,
        contractId: undefined,
        vendorId: undefined,
        fiscalYear: null,
        plannedAmount: 10000,
        committedAmount: null,
        estimatedActualAmount: null,
        notes: null
      }
    });
  });

  it("met a jour une ligne budgetaire", async () => {
    prismaMock.budgetItem.update.mockResolvedValue({ id: "b1" });

    const { updateBudgetItem } = await import("@/lib/services/budget-item-service");
    await updateBudgetItem("b1", {
      notes: "",
      fiscalYear: 2026
    });

    expect(prismaMock.budgetItem.update).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: {
        notes: null,
        fiscalYear: 2026
      }
    });
  });

  it("supprime une ligne budgetaire", async () => {
    prismaMock.budgetItem.delete.mockResolvedValue({ id: "b1" });

    const { deleteBudgetItem } = await import("@/lib/services/budget-item-service");
    await deleteBudgetItem("b1");

    expect(prismaMock.budgetItem.delete).toHaveBeenCalledWith({
      where: { id: "b1" }
    });
  });
});
