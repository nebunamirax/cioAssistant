import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { lockWrites } from "@/lib/db/write-transaction";
import { createAction, updateAction } from "@/lib/services/action-service";
import { updateProject } from "@/lib/services/project-service";
import type { ActionInput, ActionUpdateInput } from "@/lib/validation/action";
import type { PmoPreviewInput } from "@/lib/validation/pmo-intake";
import type { ProjectUpdateInput } from "@/lib/validation/project";

type ProjectPatch = Pick<ProjectUpdateInput, "status" | "priority" | "targetDate">;
type ActionPatch = Pick<ActionUpdateInput, "status" | "priority" | "dueDate">;
type Change = { field: "status" | "priority" | "targetDate" | "dueDate"; before: string | null; after: string };
type Proposal = {
  id: string;
  title: string;
  line: string;
  projectTitle?: string;
  changes: Change[];
  href?: string;
};
type Command =
  | { type: "project_updated"; entityId: string; version: string; patch: ProjectPatch }
  | { type: "action_updated"; entityId: string; version: string; patch: ActionPatch }
  | { type: "action_created"; projectId: string; version: string; input: ActionInput };
type Planned = Proposal & { command: Command };
type StoredProposal = Pick<Planned, "id" | "title" | "command">;
type Applied = { selected: string[]; items: { id: string; title: string; href: string; type: Command["type"] }[] };
type Clarification = { id: string; line: string; reason: string };

export type PmoPreview = {
  id: string | null;
  proposals: (Proposal & { type: Command["type"] })[];
  clarifications: Clarification[];
};

export type PmoApplied = Applied;

export class PmoIntakeError extends Error {
  constructor(message: string, public status = 409) {
    super(message);
  }
}

const bullet = /^\s*[-*•]\s*(?:\[[ xX]\]\s*)?/;

function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("fr")
    .replace(/[^a-z0-9\s/-]/g, " ").replace(/\s+/g, " ").trim();
}

function hasTitle(line: string, title: string) {
  return Boolean(title) && ` ${line} `.includes(` ${title} `);
}

function resolveTitleMatches<T>(matches: { name: string; row: T }[]) {
  const distinct = matches.filter(({ name }) => !matches.some((other) => other.name !== name && hasTitle(other.name, name)));
  return { item: distinct.length === 1 ? distinct[0].row : undefined, ambiguous: distinct.length > 1 };
}

function withoutTitle(line: string, title?: string) {
  return title ? ` ${line} `.replace(` ${normalize(title)} `, " ").trim() : line;
}

function detectActionStatus(text: string): ActionPatch["status"] {
  if (/\b(todo|a faire|non demarre[e]?)\b/.test(text)) return "TODO";
  if (/\b(done|termine[e]?|fini[e]?|fait[e]?|realise[e]?|cloture[e]?|clos[e]?)\b/.test(text)) return "DONE";
  if (/\b(blocked|bloque[e]?|blocage|bloquant[e]?)\b/.test(text)) return "BLOCKED";
  if (/\b(waiting|attente|dependance)\b/.test(text)) return "WAITING";
  if (/\b(in progress|en cours|demarre[e]?|lance[e]?)\b/.test(text)) return "IN_PROGRESS";
}

function detectProjectStatus(text: string): ProjectPatch["status"] {
  if (/\b(draft|brouillon|cadrage|a cadrer|non demarre[e]?)\b/.test(text)) return "DRAFT";
  if (/\b(completed|termine[e]?|cloture[e]?|clos[e]?|fini[e]?)\b/.test(text)) return "COMPLETED";
  if (/\b(cancelled|annule[e]?|abandonne[e]?)\b/.test(text)) return "CANCELLED";
  if (/\b(on hold|pause|suspendu[e]?|bloque[e]?|attente)\b/.test(text)) return "ON_HOLD";
  if (/\b(active|actif|en cours|lance[e]?|demarre[e]?)\b/.test(text)) return "ACTIVE";
}

function detectPriority(text: string): ActionPatch["priority"] {
  if (/\b(critical|critique|urgent[e]?|bloquant[e]?)\b/.test(text)) return "CRITICAL";
  if (/\b(high|haut[e]?|important[e]?)\b/.test(text)) return "HIGH";
  if (/\b(low|bas|basse|faible)\b/.test(text)) return "LOW";
  if (/\b(normal[e]?)\b/.test(text)) return "NORMAL";
}

function readDate(text: string) {
  const dates = Array.from(text.matchAll(/\b(?:(20\d{2})-(\d{2})-(\d{2})|(\d{1,2})\/(\d{1,2})\/(20\d{2}))\b/g), (match) => {
    const [, isoYear, isoMonth, isoDay, day, month, year] = match;
    return isoYear ? `${isoYear}-${isoMonth}-${isoDay}` : `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  });
  if (new Set(dates).size > 1) return { error: "Plusieurs dates figurent sur cette ligne. Précisez l’échéance." };
  const day = dates[0];
  if (!day) return {};
  const date = new Date(`${day}T09:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== day) return { error: "Cette date est invalide." };
  return { date: date.toISOString() };
}

function diff(field: Change["field"], before: string | null, after?: string): Change[] {
  const dateField = field === "dueDate" || field === "targetDate";
  if (after === undefined || (dateField ? before?.slice(0, 10) === after.slice(0, 10) : before === after)) return [];
  return [{ field, before, after }];
}

function actionTitle(line: string) {
  return line.replace(bullet, "").replace(/^\s*(action|t[âa]che|task|todo)\s*[:–-]\s*/i, "")
    .split(/(?:[,;]\s*|\s+)(?=(?:statut|status|échéance|echeance|deadline|priorité|priorite)\s*[:=]?\s|(?:urgent[e]?|critique|prioritaire)\b)/i)[0]
    .trim().replace(/[,;]+$/, "").trim();
}

const linkToAction = (id: string) => `/actions?selectedId=${encodeURIComponent(id)}`;
const linkToProject = (id: string) => `/projects/${encodeURIComponent(id)}`;

export async function previewPmoImport(input: PmoPreviewInput, authorId: string): Promise<PmoPreview> {
  const [projects, actions] = await Promise.all([
    prisma.project.findMany({ select: { id: true, title: true, status: true, priority: true, startDate: true, targetDate: true, updatedAt: true } }),
    prisma.action.findMany({
      where: input.projectId ? { projectId: input.projectId } : undefined,
      select: { id: true, title: true, status: true, priority: true, dueDate: true, updatedAt: true, projectId: true }
    })
  ]);
  const scope = input.projectId ? projects.find((project) => project.id === input.projectId) : undefined;
  if (input.projectId && !scope) throw new PmoIntakeError("Ce projet est introuvable.", 404);
  const sourceName = input.sourceName || "Compte rendu";
  const namedProjects = projects.map((row) => ({ row, name: normalize(row.title) }));
  const namedActions = actions.map((row) => ({ row, name: normalize(row.title) }));
  const planned: Planned[] = [];
  const clarifications: Clarification[] = [];
  const seen = new Set<string>();

  for (const [index, raw] of input.text.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (line.length < 3) continue;
    const id = String(index + 1);
    const text = normalize(line.replace(bullet, ""));
    const explicitProject = /^(projet|project)\b/.test(text);
    const explicitAction = /^(action|tache|task|todo)\b/.test(text);
    const actionLine = !explicitProject && (bullet.test(line) || /^(action|t[âa]che|task|todo)\s*[:–-]/i.test(line) || /\b(a faire|next step|prochaine etape)\b/.test(text));
    const projectMatches = namedProjects.filter(({ name }) => hasTitle(text, name));
    const sameScope = projectMatches.filter(({ row }) => row.id === scope?.id);
    const namedProject = resolveTitleMatches(sameScope.length && projectMatches.every(({ name }) => name === sameScope[0].name) ? sameScope : projectMatches);
    const project = namedProject.item ?? scope;
    const namedAction = explicitProject ? null : resolveTitleMatches(namedActions.filter(({ name, row }) =>
      (!project || row.projectId === project.id) && hasTitle(text, name)
    ));
    const matchedAction = namedAction?.item;
    const action = matchedAction && !(actionLine && !explicitAction &&
      !normalize(actionTitle(line)).startsWith(normalize(matchedAction.title))) ? matchedAction : undefined;
    const clarify = (reason: string) => clarifications.push({ id, line, reason });
    const add = (key: string, proposal: Omit<Planned, "id" | "line">) => {
      if (seen.has(key)) {
        clarify("Une proposition existe déjà pour cette fiche. Regroupez ses changements sur une ligne.");
        return;
      }
      seen.add(key);
      planned.push({ ...proposal, id, line });
    };

    if (scope && namedProject.item && scope.id !== namedProject.item.id) {
      clarify(`Cette ligne cite « ${namedProject.item.title} », alors que le projet sélectionné est « ${scope.title} ».`);
      continue;
    }
    if (namedProject.ambiguous || namedAction?.ambiguous) {
      clarify("Plusieurs fiches peuvent correspondre. Précisez un seul projet ou une seule action.");
      continue;
    }
    if (explicitProject && !namedProject.item) {
      clarify("Indiquez le titre exact du projet à mettre à jour.");
      continue;
    }
    if (!action && !actionLine && (explicitAction || !namedProject.item)) {
      if (/\b(projet|project|action|tache|task|todo|statut|status)\b/.test(text)) clarify("Indiquez le titre du projet ou de l’action.");
      continue;
    }

    const details = withoutTitle(withoutTitle(text, action?.title), namedProject.item?.title);
    const { date, error } = readDate(details);
    if (error) { clarify(error); continue; }
    if (/\b(pas|jamais|ne|non)\b/.test(details.replace(/\bnon demarre[e]?\b/g, "")) && (action || !actionLine)) {
      clarify("Le statut est ambigu. Indiquez le statut à enregistrer.");
      continue;
    }
    const priority = detectPriority(details);

    if (action) {
      const status = detectActionStatus(details);
      const changes = [...diff("status", action.status, status), ...diff("priority", action.priority, priority), ...diff("dueDate", action.dueDate?.toISOString() ?? null, date)];
      if (!changes.length) { clarify("Aucun nouveau statut, niveau de priorité ou délai détecté pour cette action."); continue; }
      const patch: ActionPatch = {};
      for (const { field } of changes) {
        if (field === "status") patch.status = status;
        if (field === "priority") patch.priority = priority;
        if (field === "dueDate") patch.dueDate = date;
      }
      add(`action:${action.id}`, {
        title: action.title, href: linkToAction(action.id), changes,
        projectTitle: projects.find((item) => item.id === action.projectId)?.title,
        command: { type: "action_updated", entityId: action.id, version: action.updatedAt.toISOString(), patch }
      });
      continue;
    }

    if (project && !actionLine) {
      const status = detectProjectStatus(details);
      if (date && project.startDate && date.slice(0, 10) < project.startDate.toISOString().slice(0, 10)) {
        clarify("La date cible précède le début du projet.");
        continue;
      }
      const changes = [...diff("status", project.status, status), ...diff("priority", project.priority, priority), ...diff("targetDate", project.targetDate?.toISOString() ?? null, date)];
      if (!changes.length) { clarify("Aucun nouveau statut, niveau de priorité ou délai détecté pour ce projet."); continue; }
      const patch: ProjectPatch = {};
      for (const { field } of changes) {
        if (field === "status") patch.status = status;
        if (field === "priority") patch.priority = priority;
        if (field === "targetDate") patch.targetDate = date;
      }
      add(`project:${project.id}`, {
        title: project.title, href: linkToProject(project.id), changes,
        command: { type: "project_updated", entityId: project.id, version: project.updatedAt.toISOString(), patch }
      });
      continue;
    }

    if (!project) { clarify("Choisissez un projet ou ajoutez son titre à cette action."); continue; }
    const title = actionTitle(line);
    if (title.length < 3 || title.length > 250) { clarify("Donnez à l’action un titre de 3 à 250 caractères."); continue; }
    const status = detectActionStatus(details) ?? "TODO";
    const actionPriority = priority ?? "NORMAL";
    add(`new:${project.id}:${normalize(title)}`, {
      title, projectTitle: project.title,
      changes: [...diff("status", null, status), ...diff("priority", null, actionPriority), ...diff("dueDate", null, date)],
      command: {
        type: "action_created", projectId: project.id, version: project.updatedAt.toISOString(),
        input: { title, description: `Source PMO · ${sourceName}`, status, priority: actionPriority, dueDate: date, projectId: project.id, sourceType: "PMO_INTAKE", sourceRef: sourceName }
      }
    });
  }

  const draft = planned.length ? await prisma.pmoImport.create({
    data: { authorId, sourceName, plan: JSON.stringify(planned.map(({ id, title, command }) => ({ id, title, command }))) }, select: { id: true }
  }) : null;
  return {
    id: draft?.id ?? null,
    proposals: planned.map(({ command, ...proposal }) => ({ ...proposal, type: command.type })),
    clarifications
  };
}

async function checkCurrent(db: Prisma.TransactionClient, { command, title }: StoredProposal) {
  const current = command.type === "action_updated"
    ? await db.action.findUnique({ where: { id: command.entityId }, select: { updatedAt: true } })
    : await db.project.findUnique({ where: { id: command.type === "action_created" ? command.projectId : command.entityId }, select: { updatedAt: true } });
  if (current?.updatedAt.toISOString() !== command.version) {
    throw new PmoIntakeError(`« ${title} » a changé depuis l’aperçu. Relancez l’analyse.`);
  }
  if (command.type === "action_created" && await db.action.findFirst({
    where: { projectId: command.projectId, title: command.input.title }, select: { id: true }
  })) {
    throw new PmoIntakeError(`L’action « ${title} » existe déjà. Relancez l’analyse.`);
  }
}

export async function applyPmoImport(importId: string, selectedIds: string[], authorId: string): Promise<PmoApplied> {
  const selected = [...new Set(selectedIds)].sort();
  return prisma.$transaction(async (db) => {
    await lockWrites(db);
    const draft = await db.pmoImport.findUnique({ where: { id: importId, authorId } });
    if (!draft) throw new PmoIntakeError("Cet aperçu est introuvable. Relancez l’analyse.", 404);
    if (draft.result) {
      const previous = JSON.parse(draft.result) as PmoApplied;
      if (JSON.stringify(previous.selected) !== JSON.stringify(selected)) throw new PmoIntakeError("Cet aperçu a déjà été appliqué.");
      return previous;
    }

    const planned = (JSON.parse(draft.plan) as StoredProposal[]).filter((item) => selected.includes(item.id));
    if (!planned.length || planned.length !== selected.length) throw new PmoIntakeError("La sélection contient une proposition invalide.", 422);
    for (const item of planned) await checkCurrent(db, item);

    const items: PmoApplied["items"] = [];
    for (const { command, title, id } of planned) {
      if (command.type === "project_updated") {
        const project = await updateProject(command.entityId, command.patch, db);
        items.push({ id, title, type: command.type, href: linkToProject(project.id) });
      } else {
        const action = command.type === "action_updated"
          ? await updateAction(command.entityId, command.patch, db)
          : await createAction(command.input, db);
        items.push({ id, title, type: command.type, href: linkToAction(action.id) });
      }
    }
    const result = { selected, items };
    await db.pmoImport.update({ where: { id: draft.id }, data: { result: JSON.stringify(result) } });
    return result;
  }, { timeout: 15000 });
}
