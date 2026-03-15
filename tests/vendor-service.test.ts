import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  vendor: {
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

describe("vendor-service", () => {
  beforeEach(() => {
    prismaMock.vendor.create.mockReset();
    prismaMock.vendor.delete.mockReset();
    prismaMock.vendor.findMany.mockReset();
    prismaMock.vendor.findUnique.mockReset();
    prismaMock.vendor.update.mockReset();
  });

  it("liste les prestataires avec compteurs", async () => {
    prismaMock.vendor.findMany.mockResolvedValue([{ id: "v1" }]);

    const { listVendors } = await import("@/lib/services/vendor-service");
    const result = await listVendors();

    expect(prismaMock.vendor.findMany).toHaveBeenCalledWith({
      where: {},
      include: {
        _count: {
          select: {
            actions: true,
            contracts: true,
            supportServices: true,
            budgetItems: true
          }
        }
      },
      orderBy: [{ name: "asc" }, { createdAt: "desc" }]
    });
    expect(result).toEqual([{ id: "v1" }]);
  });

  it("applique les filtres de recherche et categorie", async () => {
    prismaMock.vendor.findMany.mockResolvedValue([]);

    const { listVendors } = await import("@/lib/services/vendor-service");
    await listVendors({
      search: "Acme",
      category: "Cloud"
    });

    expect(prismaMock.vendor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [
                { name: { contains: "Acme" } },
                { category: { contains: "Acme" } },
                { mainContactName: { contains: "Acme" } },
                { mainContactEmail: { contains: "Acme" } }
              ]
            },
            { category: { contains: "Cloud" } }
          ]
        }
      })
    );
  });

  it("cree un prestataire avec normalisation", async () => {
    prismaMock.vendor.create.mockResolvedValue({ id: "v1" });

    const { createVendor } = await import("@/lib/services/vendor-service");
    await createVendor({
      name: "Acme",
      mainContactEmail: ""
    });

    expect(prismaMock.vendor.create).toHaveBeenCalledWith({
      data: {
        name: "Acme",
        category: null,
        mainContactName: null,
        mainContactEmail: null,
        notes: null
      }
    });
  });

  it("met a jour un prestataire", async () => {
    prismaMock.vendor.update.mockResolvedValue({ id: "v1" });

    const { updateVendor } = await import("@/lib/services/vendor-service");
    await updateVendor("v1", {
      notes: "",
      category: "Cloud"
    });

    expect(prismaMock.vendor.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: {
        notes: null,
        category: "Cloud"
      }
    });
  });

  it("supprime un prestataire", async () => {
    prismaMock.vendor.delete.mockResolvedValue({ id: "v1" });

    const { deleteVendor } = await import("@/lib/services/vendor-service");
    await deleteVendor("v1");

    expect(prismaMock.vendor.delete).toHaveBeenCalledWith({
      where: { id: "v1" }
    });
  });
});
