import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  vendor: {
    findFirst: vi.fn(),
    create: vi.fn()
  },
  project: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
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
  },
  aIIntakeReview: {
    create: vi.fn(),
    update: vi.fn()
  }
};

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock
}));

const analyzeIntakeMock = vi.fn();
const planIntakeMock = vi.fn();

vi.mock("@/lib/ai/provider-factory", async () => {
  return {
    getAIProvider: vi.fn(() => ({
      info: {
        provider: "test",
        label: "Test intake analyzer",
        mode: "test",
        model: "analyzer",
        location: "local"
      },
      planIntake: planIntakeMock,
      analyzeIntake: analyzeIntakeMock,
      suggestDraft: vi.fn(async () => ({}))
    }))
  };
});

describe("ai-intake-service", () => {
  beforeEach(() => {
    planIntakeMock.mockReset();
    analyzeIntakeMock.mockReset();
    prismaMock.vendor.findFirst.mockReset();
    prismaMock.vendor.create.mockReset();
    prismaMock.project.findFirst.mockReset();
    prismaMock.project.findMany.mockReset();
    prismaMock.project.create.mockReset();
    prismaMock.contract.findFirst.mockReset();
    prismaMock.contract.create.mockReset();
    prismaMock.budgetItem.create.mockReset();
    prismaMock.communication.create.mockReset();
    prismaMock.action.create.mockReset();
    prismaMock.aIIntakeReview.create.mockReset();
    prismaMock.aIIntakeReview.update.mockReset();

    prismaMock.vendor.findFirst.mockResolvedValue(null);
    prismaMock.project.findFirst.mockResolvedValue(null);
    prismaMock.project.findMany.mockResolvedValue([]);
    prismaMock.contract.findFirst.mockResolvedValue(null);
    planIntakeMock.mockImplementation(async (input: { text: string }) => ({
      summary: input.text,
      steps: [{ id: "step_1", module: "actions", action: "create", sourceText: input.text, dependsOn: null, relation: null }]
    }));
    analyzeIntakeMock.mockImplementation(async (input: { text: string; context?: Record<string, string | number | boolean | null> }) => {
      const { analyzeIntakeText } = await import("@/lib/ai/intake-analyzer");

      return analyzeIntakeText(input.text, typeof input.context?.sourceName === "string" ? input.context.sourceName : null);
    });
    prismaMock.aIIntakeReview.create.mockImplementation(async ({ data }) => ({
      id: "review-1",
      sourceName: data.sourceName ?? null,
      rawText: data.rawText,
      providerMode: data.providerMode,
      providerLabel: data.providerLabel,
      providerModel: data.providerModel,
      summary: data.summary ?? null,
      suggestedModulesJson: data.suggestedModulesJson ?? null,
      analysisJson: data.analysisJson ?? null,
      status: "PENDING",
      reviewReason: data.reviewReason ?? null,
      selectedModule: null,
      draftDataJson: null,
      createdEntityType: null,
      createdEntityId: null,
      createdEntityHref: null,
      reviewedAt: null,
      createdAt: new Date("2026-03-15T10:00:00.000Z"),
      updatedAt: new Date("2026-03-15T10:00:00.000Z")
    }));
    prismaMock.aIIntakeReview.update.mockImplementation(async ({ data }) => ({
      id: "review-1",
      sourceName: null,
      rawText: "Texte libre sans structure metier claire mais a conserver dans le systeme.",
      providerMode: "test",
      providerLabel: "Test intake analyzer",
      providerModel: "analyzer",
      summary: "Texte libre sans structure metier claire mais a conserver dans le systeme.",
      suggestedModulesJson: "[]",
      analysisJson: null,
      status: "PENDING",
      reviewReason: "Aucun module clair n’a été reconnu automatiquement.",
      selectedModule: data.selectedModule ?? "actions",
      draftDataJson: data.draftDataJson ?? null,
      createdEntityType: null,
      createdEntityId: null,
      createdEntityHref: null,
      reviewedAt: null,
      createdAt: new Date("2026-03-15T10:00:00.000Z"),
      updatedAt: new Date("2026-03-15T10:00:00.000Z")
    }));
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
    expect(result.disposition).toBe("created");
    if (result.disposition !== "created") {
      throw new Error("Expected created result");
    }
    expect(result.modules).toEqual(["projects", "vendors", "contracts", "budget", "communications", "actions"]);
    expect(result.created).toEqual([
      { module: "projects", id: "p1", title: "Migration Azure", href: "/projects/p1" },
      { module: "vendors", id: "v1", title: "Microsoft", href: "/vendors/v1" },
      { module: "contracts", id: "c1", title: "Enterprise Agreement", href: "/contracts/c1" },
      { module: "budget", id: "b1", title: "Budget cloud 2026", href: "/budget/b1" },
      { module: "communications", id: "m1", title: "Annonce migration Azure", href: "/communications/m1" },
      { module: "actions", id: "a1", title: "Valider le planning avant le 2026-05-20", href: "/actions/a1" },
      { module: "actions", id: "a2", title: "Notifier le codir", href: "/actions/a2" }
    ]);
  });

  it("envoie en revue manuelle une demande qui n'est pas reconnue proprement", async () => {
    prismaMock.vendor.findFirst.mockResolvedValue({ id: "v-existing", name: "Acme" });
    prismaMock.project.findFirst.mockResolvedValue({ id: "p-existing", title: "Projet existant" });

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
    expect(prismaMock.action.create).not.toHaveBeenCalled();
    expect(prismaMock.aIIntakeReview.create).toHaveBeenCalled();
    expect(prismaMock.aIIntakeReview.update).toHaveBeenCalled();
    expect(result.disposition).toBe("review");
    if (result.disposition !== "review") {
      throw new Error("Expected review result");
    }
    expect(result.reviewId).toBe("review-1");
    expect(result.selectedModule).toBe("actions");
  });

  it("préremplit la revue avec un titre et une échéance pour une demande simple envoyée par mail", async () => {
    let latestDraftDataJson: string | null = null;
    prismaMock.aIIntakeReview.update.mockImplementationOnce(async ({ data }) => {
      latestDraftDataJson = data.draftDataJson ?? null;
      return {
        id: "review-2",
        sourceName: null,
        rawText: "Hello Max,\n\nTu pourrais me changer mon pc le 28/07/2026 ?\n\nMerci !",
        providerMode: "test",
        providerLabel: "Test intake analyzer",
        providerModel: "analyzer",
        summary: "Hello Max, Tu pourrais me changer mon pc le 28/07/2026 ? Merci !",
        suggestedModulesJson: "[]",
        analysisJson: null,
        status: "PENDING",
        reviewReason: "Le modèle n’a pas choisi de module principal exploitable. La demande part en revue manuelle.",
        selectedModule: data.selectedModule ?? "actions",
        draftDataJson: data.draftDataJson ?? null,
        createdEntityType: null,
        createdEntityId: null,
        createdEntityHref: null,
        reviewedAt: null,
        createdAt: new Date("2026-03-15T10:00:00.000Z"),
        updatedAt: new Date("2026-03-15T10:00:00.000Z")
      };
    });

    const { ingestAIIntake } = await import("@/lib/services/ai-intake-service");
    const result = await ingestAIIntake({
      text: "Hello Max,\n\nTu pourrais me changer mon pc le 28/07/2026 ?\n\nMerci !"
    });

    expect(result.disposition).toBe("review");
    expect(result.selectedModule).toBe("actions");
    expect(latestDraftDataJson).not.toBeNull();
    const draft = JSON.parse(String(latestDraftDataJson)) as Record<string, unknown>;
    expect(String(draft.title)).toContain("changer mon pc");
    expect(draft.dueDate).toBe("2026-07-28T09:00:00.000Z");
  });

  it("cree un projet et plusieurs actions associees quand la liste d'actions est inline", async () => {
    prismaMock.project.create.mockResolvedValue({ id: "p-inline", title: "toto" });
    prismaMock.action.create
      .mockResolvedValueOnce({ id: "a-inline-1", title: "commander les telephones" })
      .mockResolvedValueOnce({ id: "a-inline-2", title: "planifier le cablage" })
      .mockResolvedValueOnce({ id: "a-inline-3", title: "organiser la bascule" });

    const { ingestAIIntake } = await import("@/lib/services/ai-intake-service");
    const result = await ingestAIIntake({
      text: `ajoute un projet "toto" qui commence le 12/01/2026 et termine le 15/05/2026 et ajoute cette liste d'action : commander les telephones, planifier le cablage, organiser la bascule`
    });

    expect(prismaMock.project.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "toto",
        type: "DEVELOPMENT",
        startDate: new Date("2026-01-12T09:00:00.000Z"),
        targetDate: new Date("2026-05-15T09:00:00.000Z")
      })
    });
    expect(prismaMock.action.create).toHaveBeenCalledTimes(3);
    expect(prismaMock.action.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          title: "commander les telephones",
          projectId: "p-inline"
        })
      })
    );
    expect(prismaMock.action.create).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        data: expect.objectContaining({
          title: "organiser la bascule",
          projectId: "p-inline"
        })
      })
    );
    expect(result.disposition).toBe("created");
  });

  it("cree automatiquement projet et action quand le provider echoue mais que l'analyse locale est claire", async () => {
    analyzeIntakeMock.mockRejectedValueOnce(new Error("Provider indisponible"));
    prismaMock.project.create.mockResolvedValue({ id: "p-fallback", title: "toto" });
    prismaMock.action.create.mockResolvedValue({ id: "a-fallback", title: "titi" });

    const { ingestAIIntake } = await import("@/lib/services/ai-intake-service");
    const result = await ingestAIIntake({
      text: 'créer un projet "toto" et ajoute une action à ce projet "titi"'
    });

    expect(prismaMock.project.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "toto"
      })
    });
    expect(prismaMock.action.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "titi",
          projectId: "p-fallback"
        })
      })
    );
    expect(prismaMock.aIIntakeReview.create).not.toHaveBeenCalled();
    expect(result.disposition).toBe("created");
    if (result.disposition !== "created") {
      throw new Error("Expected created result");
    }
    expect(result.modules).toEqual(["projects", "actions"]);
  });

  it("execute une demande composee etape par etape quand le planner detecte plusieurs intentions", async () => {
    planIntakeMock.mockResolvedValueOnce({
      summary: "Créer le projet toto puis ajouter l'action titi.",
      steps: [
        { id: "step_1", module: "projects", action: "create", sourceText: "créer un projet toto", dependsOn: null, relation: null },
        { id: "step_2", module: "actions", action: "create", sourceText: "ajoute une action titi au projet toto", dependsOn: "step_1", relation: "project_of" }
      ]
    });
    prismaMock.project.create.mockResolvedValue({ id: "p-plan", title: "toto" });
    prismaMock.action.create.mockResolvedValue({ id: "a-plan", title: "titi" });

    const { ingestAIIntake } = await import("@/lib/services/ai-intake-service");
    const result = await ingestAIIntake({
      text: "créer un projet toto et ajoute une action titi au projet toto"
    });

    expect(prismaMock.project.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "toto"
      })
    });
    expect(prismaMock.action.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "titi",
          projectId: "p-plan"
        })
      })
    );
    expect(result.disposition).toBe("created");
  });

  it("decompose une demande composee projet plus action et traite chaque intention proprement", async () => {
    analyzeIntakeMock.mockRejectedValueOnce(new Error("Provider indisponible"));
    prismaMock.project.create.mockResolvedValue({ id: "p-composed", title: "toto" });
    prismaMock.action.create.mockResolvedValue({ id: "a-composed", title: "titi" });

    const { ingestAIIntake } = await import("@/lib/services/ai-intake-service");
    const result = await ingestAIIntake({
      text: "créer un projet toto et ajoute une action titi au projet toto"
    });

    expect(prismaMock.project.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "toto"
      })
    });
    expect(prismaMock.action.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "titi",
          projectId: "p-composed"
        })
      })
    );
    expect(result.disposition).toBe("created");
    if (result.disposition !== "created") {
      throw new Error("Expected created result");
    }
    expect(result.created).toEqual([
      { module: "projects", id: "p-composed", title: "toto", href: "/projects/p-composed" },
      { module: "actions", id: "a-composed", title: "titi", href: "/actions/a-composed" }
    ]);
  });

  it("rattache une action a un projet existant grace aux projets candidats injectes en contexte", async () => {
    analyzeIntakeMock.mockResolvedValueOnce({
      summary: "Ajouter une action au projet Phoenix.",
      primaryModule: "actions",
      routingConfidence: 0.91,
      reviewRecommended: false,
      toolCalls: [
        {
          tool: "create_action",
          args: {
            title: "Valider le lot de migration",
            description: "Ajouter une action au projet Phoenix.",
            status: "TODO",
            priority: "NORMAL"
          }
        }
      ]
    });
    prismaMock.project.findMany.mockResolvedValueOnce([
      {
        id: "project-phoenix",
        title: "Projet Phoenix",
        status: "ACTIVE",
        priority: "HIGH",
        description: "Programme de migration"
      }
    ]);
    prismaMock.action.create.mockResolvedValue({ id: "a-phoenix", title: "Valider le lot de migration" });

    const { ingestAIIntake } = await import("@/lib/services/ai-intake-service");
    const result = await ingestAIIntake({
      text: "Ajoute une action de validation au Projet Phoenix pour le prochain lot."
    });

    expect(analyzeIntakeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          candidateProjects: expect.stringContaining("Projet Phoenix")
        })
      })
    );
    expect(prismaMock.action.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "project-phoenix"
        })
      })
    );
    expect(prismaMock.project.create).not.toHaveBeenCalled();
    expect(result.disposition).toBe("created");
  });

  it("ne cree pas de projet generique quand la demande vise un projet existant", async () => {
    analyzeIntakeMock.mockRejectedValueOnce(new Error("Provider indisponible"));
    prismaMock.project.findMany.mockResolvedValueOnce([
      {
        id: "project-toto",
        title: "toto",
        status: "ACTIVE",
        priority: "NORMAL",
        description: "Projet existant"
      }
    ]);
    prismaMock.action.create.mockResolvedValue({ id: "a-existing", title: "titi" });

    const { ingestAIIntake } = await import("@/lib/services/ai-intake-service");
    const result = await ingestAIIntake({
      text: "ajoute une action titi au projet toto"
    });

    expect(prismaMock.project.create).not.toHaveBeenCalled();
    expect(prismaMock.action.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "titi",
          projectId: "project-toto"
        })
      })
    );
    expect(result.disposition).toBe("created");
    if (result.disposition !== "created") {
      throw new Error("Expected created result");
    }
    expect(result.created).toEqual([
      { module: "actions", id: "a-existing", title: "titi", href: "/actions/a-existing" }
    ]);
  });
});
