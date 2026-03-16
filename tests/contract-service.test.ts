import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  contract: {
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

describe("contract-service", () => {
  beforeEach(() => {
    prismaMock.contract.create.mockReset();
    prismaMock.contract.delete.mockReset();
    prismaMock.contract.findMany.mockReset();
    prismaMock.contract.findUnique.mockReset();
    prismaMock.contract.update.mockReset();
  });

  it("liste les contrats avec relations et compteurs", async () => {
    prismaMock.contract.findMany.mockResolvedValue([{ id: "c1" }]);

    const { listContracts } = await import("@/lib/services/contract-service");
    const result = await listContracts();

    expect(prismaMock.contract.findMany).toHaveBeenCalledWith({
      where: {},
      include: {
        vendor: true,
        project: true,
        _count: {
          select: {
            actions: true,
            budgetItems: true,
            communications: true,
            supportServices: true
          }
        }
      },
      orderBy: [{ endDate: "asc" }, { createdAt: "desc" }]
    });
    expect(result).toEqual([{ id: "c1" }]);
  });

  it("applique les filtres de recherche et d echeance", async () => {
    prismaMock.contract.findMany.mockResolvedValue([]);

    const { listContracts } = await import("@/lib/services/contract-service");
    await listContracts({
      search: "infogerance",
      status: "ACTIVE",
      renewalType: "AUTO",
      expiringOnly: true
    });

    expect(prismaMock.contract.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [
                { title: { contains: "infogerance" } },
                { notes: { contains: "infogerance" } }
              ]
            },
            { status: "ACTIVE" },
            { renewalType: "AUTO" },
            { endDate: { gte: expect.any(Date) } },
            { endDate: { lte: expect.any(Date) } },
            { status: "ACTIVE" }
          ]
        }
      })
    );
  });

  it("cree un contrat avec normalisation", async () => {
    prismaMock.contract.create.mockResolvedValue({ id: "c1" });

    const { createContract } = await import("@/lib/services/contract-service");
    await createContract({
      vendorId: "v1",
      title: "Infogerance 2026",
      status: "DRAFT",
      renewalType: "NONE",
      amountPlanned: 12000,
      startDate: "2026-03-15T10:00:00.000Z"
    });

    expect(prismaMock.contract.create).toHaveBeenCalledWith({
      data: {
        vendorId: "v1",
        projectId: undefined,
        title: "Infogerance 2026",
        contractType: null,
        status: "DRAFT",
        startDate: new Date("2026-03-15T10:00:00.000Z"),
        endDate: null,
        noticePeriodDays: null,
        amountPlanned: 12000,
        notes: null,
        renewalType: "NONE"
      }
    });
  });

  it("met a jour un contrat", async () => {
    prismaMock.contract.update.mockResolvedValue({ id: "c1" });

    const { updateContract } = await import("@/lib/services/contract-service");
    await updateContract("c1", {
      notes: "",
      status: "ACTIVE"
    });

    expect(prismaMock.contract.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: {
        notes: null,
        status: "ACTIVE"
      }
    });
  });

  it("supprime un contrat", async () => {
    prismaMock.contract.delete.mockResolvedValue({ id: "c1" });

    const { deleteContract } = await import("@/lib/services/contract-service");
    await deleteContract("c1");

    expect(prismaMock.contract.delete).toHaveBeenCalledWith({
      where: { id: "c1" }
    });
  });
});
