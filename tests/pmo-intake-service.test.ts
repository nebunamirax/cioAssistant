import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  $executeRaw: vi.fn(),
  $transaction: vi.fn(),
  project: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  action: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
  pmoImport: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() }
}));

vi.mock("@/lib/db/prisma", () => ({ prisma }));

import { applyPmoImport, previewPmoImport } from "@/lib/services/pmo-intake-service";

const author = "dsi";
const version = new Date("2026-11-10T10:30:00.000Z");
const project = {
  id: "project-1", title: "Modernisation ERP finance", status: "DRAFT", priority: "NORMAL",
  startDate: new Date("2026-01-01"), targetDate: null, updatedAt: version
};
const action = {
  id: "action-1", title: "Valider le périmètre lot 1 ERP", status: "TODO", priority: "NORMAL",
  projectId: project.id, dueDate: null, updatedAt: version
};

function preview(text: string, projectId?: string) {
  return previewPmoImport({ mode: "preview", text, sourceName: "CR COPIL", projectId }, author);
}

function loadDraftFromPreview(result: string | null = null) {
  prisma.pmoImport.findUnique.mockResolvedValue({ id: "import-1", ...prisma.pmoImport.create.mock.calls[0][0].data, result });
}

describe("revue des imports PMO", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.$transaction.mockImplementation((run) => run(prisma));
    prisma.project.findMany.mockResolvedValue([project]);
    prisma.action.findMany.mockResolvedValue([action]);
    prisma.pmoImport.create.mockResolvedValue({ id: "import-1" });
    prisma.project.findUnique.mockResolvedValue(project);
    prisma.action.findUnique.mockResolvedValue(action);
    prisma.action.findFirst.mockResolvedValue(null);
    prisma.project.update.mockResolvedValue(project);
    prisma.action.update.mockResolvedValue(action);
    prisma.action.create.mockResolvedValue({ id: "action-2" });
  });

  it("présente les valeurs et la source avant toute modification métier", async () => {
    const text = "Action Valider le périmètre lot 1 ERP terminée";
    const result = await preview(text);
    expect(result).toMatchObject({
      id: "import-1",
      proposals: [{
        type: "action_updated", title: action.title, line: text,
        changes: [{ field: "status", before: "TODO", after: "DONE" }]
      }]
    });
    expect(prisma.action.update).not.toHaveBeenCalled();
    expect(prisma.action.create).not.toHaveBeenCalled();
    expect(prisma.project.update).not.toHaveBeenCalled();
    expect(prisma.pmoImport.create.mock.calls[0][0].data.plan).not.toContain(text);
  });

  it("applique uniquement les propositions sélectionnées et rejoue la même confirmation sans nouvelle écriture", async () => {
    const result = await preview("Projet Modernisation ERP finance en cours, cible 30/11/2026\nAction Valider le périmètre lot 1 ERP terminée");
    expect(result.proposals).toHaveLength(2);
    loadDraftFromPreview();
    const applied = await applyPmoImport("import-1", ["2"], author);
    expect(applied.items).toEqual([{ id: "2", title: action.title, type: "action_updated", href: "/actions?selectedId=action-1" }]);
    expect(prisma.action.update).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: action.id }), data: { status: "DONE" } }));
    expect(prisma.project.update).not.toHaveBeenCalled();
    loadDraftFromPreview(JSON.stringify(applied));
    expect(await applyPmoImport("import-1", ["2"], author)).toEqual(applied);
    expect(prisma.action.update).toHaveBeenCalledTimes(1);
    await expect(applyPmoImport("import-1", ["1"], author)).rejects.toMatchObject({ status: 409 });
  });

  it("crée une action dans le projet choisi et conserve le libellé de source", async () => {
    const result = await preview("- Préparer le support COMEX, urgent, échéance 18/11/2026", project.id);
    expect(result.proposals[0]).toMatchObject({ type: "action_created", title: "Préparer le support COMEX", projectTitle: project.title });
    loadDraftFromPreview();
    await applyPmoImport("import-1", ["1"], author);
    expect(prisma.action.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Préparer le support COMEX", projectId: project.id, priority: "CRITICAL",
        dueDate: new Date("2026-11-18T09:00:00.000Z"), sourceType: "PMO_INTAKE", sourceRef: "CR COPIL"
      })
    });
  });

  it("applique la date cible et le statut proposés pour un projet", async () => {
    await preview("Projet Modernisation ERP finance en cours, cible 30/11/2026");
    loadDraftFromPreview();
    await applyPmoImport("import-1", ["1"], author);
    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: project.id }, data: { status: "ACTIVE", targetDate: new Date("2026-11-30T09:00:00.000Z") }
    });
  });

  it("arrête tout le lot si une fiche a changé depuis l’analyse", async () => {
    await preview("Projet Modernisation ERP finance en cours\nAction Valider le périmètre lot 1 ERP terminée");
    loadDraftFromPreview();
    prisma.action.findUnique.mockResolvedValue({ updatedAt: new Date("2026-11-11") });
    await expect(applyPmoImport("import-1", ["1", "2"], author)).rejects.toMatchObject({ status: 409 });
    expect(prisma.project.update).not.toHaveBeenCalled();
    expect(prisma.action.update).not.toHaveBeenCalled();
  });

  it("demande de préciser les titres homonymes, les phrases ambiguës et les dates invalides", async () => {
    prisma.project.findMany.mockResolvedValue([project, { ...project, id: "project-2" }]);
    const ambiguous = await preview("Projet Modernisation ERP finance en cours");
    expect(ambiguous.id).toBeNull();
    expect(ambiguous.clarifications[0].reason).toContain("Plusieurs fiches");

    const unclear = await preview("L’action Valider le périmètre lot 1 ERP n’est pas terminée\nAction Valider le périmètre lot 1 ERP, échéance 31/11/2026");
    expect(unclear.proposals).toEqual([]);
    expect(unclear.clarifications.map(({ reason }) => reason)).toEqual([
      "Le statut est ambigu. Indiquez le statut à enregistrer.", "Cette date est invalide."
    ]);
  });

  it("utilise le projet explicitement sélectionné pour résoudre deux homonymes", async () => {
    prisma.project.findMany.mockResolvedValue([project, { ...project, id: "project-2" }]);
    const result = await preview("Projet Modernisation ERP finance en cours", project.id);
    expect(result.proposals[0]).toMatchObject({ href: `/projects/${project.id}`, type: "project_updated" });
    expect(result.clarifications).toEqual([]);
  });

  it("traite une action de suivi qui cite une autre action comme une création", async () => {
    const result = await preview("- Préparer le suivi après Valider le périmètre lot 1 ERP, échéance 21/11/2026", project.id);
    expect(result.proposals[0]).toMatchObject({ type: "action_created", projectTitle: project.title });
  });
});
