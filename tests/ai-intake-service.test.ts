import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  vendor: {
    findFirst: vi.fn(),
    create: vi.fn()
  },
  project: {
    findFirst: vi.fn(),
    create: vi.fn()
  },
  contract: {
    findFirst: vi.fn(),
    create: vi.fn()
  },
  budgetItem: {
    create: vi.fn()
  },
  communication: {
    create: vi.fn()
  },
  action: {
    create: vi.fn()
  }
};

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock
}));

describe("ai-intake-service", () => {
  beforeEach(() => {
    prismaMock.vendor.findFirst.mockReset();
    prismaMock.vendor.create.mockReset();
    prismaMock.project.findFirst.mockReset();
    prismaMock.project.create.mockReset();
    prismaMock.contract.findFirst.mockReset();
    prismaMock.contract.create.mockReset();
    prismaMock.budgetItem.create.mockReset();
    prismaMock.communication.create.mockReset();
    prismaMock.action.create.mockReset();

    prismaMock.vendor.findFirst.mockResolvedValue(null);
    prismaMock.project.findFirst.mockResolvedValue(null);
    prismaMock.contract.findFirst.mockResolvedValue(null);
  });

  it("cree des entrees multi-modules et les rattache entre elles", async () => {
    prismaMock.vendor.create.mockResolvedValue({ id: "v1", name: "Microsoft" });
    prismaMock.project.create.mockResolvedValue({ id: "p1", title: "Migration Azure" });
    prismaMock.contract.create.mockResolvedValue({ id: "c1", title: "Enterprise Agreement" });
    prismaMock.budgetItem.create.mockResolvedValue({ id: "b1", title: "Budget cloud 2026" });
    prismaMock.communication.create.mockResolvedValue({ id: "m1", title: "Annonce migration Azure" });
    prismaMock.action.create
      .mockResolvedValueOnce({ id: "a1", title: "Valider le planning avant le 2026-05-20" })
      .mockResolvedValueOnce({ id: "a2", title: "Notifier le codir" });

    const { ingestAIIntake } = await import("@/lib/services/ai-intake-service");
    const result = await ingestAIIntake({
      sourceName: "brief-migration.md",
      text: `
Projet: Migration Azure
Prestataire: Microsoft
Contrat: Enterprise Agreement
Budget: Budget cloud 2026 - 120000 EUR
Communication: Annonce migration Azure
- Valider le planning avant le 2026-05-20
- Notifier le codir
      `
    });

    expect(prismaMock.vendor.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Microsoft"
      })
    });
    expect(prismaMock.project.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Migration Azure",
        type: "MIGRATION"
      })
    });
    expect(prismaMock.contract.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        vendorId: "v1",
        projectId: "p1",
        title: "Enterprise Agreement"
      })
    });
    expect(prismaMock.budgetItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Budget cloud 2026",
        plannedAmount: 120000,
        vendorId: "v1",
        projectId: "p1",
        contractId: "c1"
      })
    });
    expect(prismaMock.communication.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Annonce migration Azure",
        projectId: "p1",
        contractId: "c1"
      })
    });
    expect(prismaMock.action.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Valider le planning avant le 2026-05-20",
          projectId: "p1",
          vendorId: "v1",
          contractId: "c1",
          sourceType: "AI_INTAKE",
          sourceRef: "ai-intake:brief-migration.md",
          dueDate: new Date("2026-05-20T09:00:00.000Z")
        })
      })
    );
    expect(result.modules).toEqual(["projects", "vendors", "contracts", "budget", "communications", "actions"]);
    expect(result.created).toEqual([
      { module: "vendors", id: "v1", title: "Microsoft", href: "/vendors/v1" },
      { module: "projects", id: "p1", title: "Migration Azure", href: "/projects/p1" },
      { module: "contracts", id: "c1", title: "Enterprise Agreement", href: "/contracts/c1" },
      { module: "budget", id: "b1", title: "Budget cloud 2026", href: "/budget/b1" },
      { module: "communications", id: "m1", title: "Annonce migration Azure", href: "/communications/m1" },
      { module: "actions", id: "a1", title: "Valider le planning avant le 2026-05-20", href: "/actions/a1" },
      { module: "actions", id: "a2", title: "Notifier le codir", href: "/actions/a2" }
    ]);
  });

  it("reutilise les entites existantes et cree une action fallback si rien n'est detecte", async () => {
    prismaMock.vendor.findFirst.mockResolvedValue({ id: "v-existing", name: "Acme" });
    prismaMock.project.findFirst.mockResolvedValue({ id: "p-existing", title: "Projet existant" });
    prismaMock.action.create.mockResolvedValue({ id: "a1", title: "Action issue d'une ingestion IA - note.txt" });

    const { ingestAIIntake } = await import("@/lib/services/ai-intake-service");
    const result = await ingestAIIntake({
      sourceName: "note.txt",
      text: "Texte libre sans structure metier claire mais a conserver dans le systeme."
    });

    expect(prismaMock.vendor.create).not.toHaveBeenCalled();
    expect(prismaMock.project.create).not.toHaveBeenCalled();
    expect(prismaMock.contract.create).not.toHaveBeenCalled();
    expect(prismaMock.budgetItem.create).not.toHaveBeenCalled();
    expect(prismaMock.communication.create).not.toHaveBeenCalled();
    expect(prismaMock.action.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Action issue d'une ingestion IA - note.txt",
        sourceRef: "ai-intake:note.txt"
      })
    });
    expect(result.modules).toEqual(["actions"]);
    expect(result.created).toEqual([
      { module: "actions", id: "a1", title: "Action issue d'une ingestion IA - note.txt", href: "/actions/a1" }
    ]);
  });
});
