import { patchSchema } from "@/lib/validation/patch-schema";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { vendorSchema } from "@/lib/validation/vendor";
import { prisma } from "@/lib/db/prisma";
import { digest, publicUrl } from "@/lib/auth/session";
import { createAction, updateAction } from "@/lib/services/action-service";
import { createBudgetItem, updateBudgetItem } from "@/lib/services/budget-item-service";
import { createCommunication, updateCommunication } from "@/lib/services/communication-service";
import { createContract, updateContract } from "@/lib/services/contract-service";
import { createDecision, updateDecision } from "@/lib/services/decision-service";
import { createMeetingNote, updateMeetingNote } from "@/lib/services/meeting-note-service";
import { reportContent, saveMonthlyDraft } from "@/lib/services/monthly-report-service";
import { saveMilestone, saveObjective } from "@/lib/services/portfolio-write-service";
import { createProject, updateProject } from "@/lib/services/project-service";
import { getRoadmapActions, getRoadmapProject, getRoadmapProjects } from "@/lib/services/roadmap-service";
import { createRisk, updateRisk } from "@/lib/services/risk-service";
import { recordControl, saveService } from "@/lib/services/support-service";
import { createVendor, updateVendor } from "@/lib/services/vendor-service";
import { entities, entityName, getFields, meetingBatch, roadmapFields, searchFields, type EntityName } from "./contracts";
import { BusinessError } from "./error";
import { canonical } from "./canonical";
import { pageViews, saveWorkspacePage } from "@/lib/services/workspace-service";

type Db = Prisma.TransactionClient;
type Actor = { id: string; name: string; role: string };
type Editable = keyof typeof entities;

const routes: Record<EntityName, { model: keyof Db; key: string; title: string; href?: (row: Record<string, unknown>, id: string) => string }> = {
  objective: { model: "strategicObjective", key: "id", title: "title", href: (_, id) => `/strategy#${id}` },
  project: { model: "project", key: "id", title: "title", href: (_, id) => `/projects/${id}` },
  milestone: { model: "milestone", key: "id", title: "title", href: (row, id) => `/projects/${row.projectId}#${id}` },
  action: { model: "action", key: "id", title: "title", href: (_, id) => `/actions?selectedId=${id}` },
  service: { model: "supportService", key: "id", title: "title", href: (_, id) => `/services/${id}` },
  control: { model: "serviceControl", key: "id", title: "evidence", href: (row, id) => `/services/${row.serviceId}#${id}` },
  risk: { model: "risk", key: "id", title: "title", href: (_, id) => `/risks#${id}` },
  decision: { model: "decision", key: "id", title: "subject", href: (_, id) => `/decisions#${id}` },
  vendor: { model: "vendor", key: "id", title: "name", href: (_, id) => `/vendors/${id}` },
  contract: { model: "contract", key: "id", title: "title", href: (_, id) => `/contracts/${id}` },
  budget: { model: "budgetItem", key: "id", title: "title", href: (_, id) => `/budget/${id}` },
  meeting: { model: "meetingNote", key: "id", title: "title", href: (_, id) => `/meetings?selectedId=${id}` },
  communication: { model: "communication", key: "id", title: "title", href: (_, id) => `/communications/${id}` },
  report: { model: "monthlyReport", key: "month", title: "month", href: (_, id) => `/reports/direction?month=${id}` },
  page: { model: "workspacePage", key: "id", title: "title", href: (_, id) => `/workspace/${id}` },
  member: { model: "user", key: "id", title: "name" }
};

export function reference(entity: EntityName, row: object) {
  const data = row as Record<string, unknown>;
  const route = routes[entity];
  const id = String(data[route.key]);
  return { entity, id, url: route.href ? new URL(route.href(data, encodeURIComponent(id)), publicUrl()).href : undefined };
}

type ReadDelegate = {
  findMany(args: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  findUnique(args: Record<string, unknown>): Promise<Record<string, unknown> | null>;
};
const memberPublic = { id: true, name: true, email: true, role: true };

export async function searchBusiness(input: z.infer<typeof searchFields>) {
  const { entity, query, cursor, limit } = input;
  const route = routes[entity];
  const model = prisma[route.model] as unknown as ReadDelegate;
  const rows = await model.findMany({
    where: { [route.title]: query ? { contains: query } : undefined, [route.key]: cursor ? { gt: cursor } : undefined },
    select: entity === "member" ? memberPublic : undefined,
    orderBy: { [route.key]: "asc" }, take: limit + 1
  });
  return {
    items: rows.slice(0, limit).map((row) => ({ ...reference(entity, row), title: row[route.title], ...(entity === "member" ? { email: row.email } : {}) })),
    nextCursor: rows.length > limit ? rows[limit - 1][route.key] : null
  };
}

export async function getBusiness(input: z.infer<typeof getFields>, db: Db = prisma) {
  const { entity, id } = input;
  const route = routes[entity];
  if (db !== prisma && process.env.DATABASE_URL?.startsWith("postgres")) {
    const table = String(route.model).replace(/^./, (letter) => letter.toUpperCase());
    await db.$queryRaw(Prisma.sql`SELECT 1 FROM ${Prisma.raw('"' + table + '"')} WHERE ${Prisma.raw('"' + route.key + '"')} = ${id} FOR UPDATE`);
  }
  const model = db[route.model] as unknown as ReadDelegate;
  const row = await model.findUnique({ where: { [route.key]: id }, select: entity === "member" ? memberPublic : undefined });
  if (!row) throw new BusinessError("Fiche introuvable.", 404);
  return { ...reference(entity, row), version: digest(canonical(row)), data: businessData(entity, row) };
}

function businessData(entity: EntityName, row: object) {
  if (entity !== "page") return row;
  const { viewsJson, blocksJson, ...page } = row as Record<string, unknown>;
  return { ...page, contentBlocks: JSON.parse(String(blocksJson)), views: pageViews({ viewsJson: String(viewsJson) }) };
}

export async function readBusinessRoadmap({ projectId, status, limit, offset }: z.infer<typeof roadmapFields>) {
  function projectSummary(project: NonNullable<Awaited<ReturnType<typeof getRoadmapProject>>>) {
    const { _count, milestones, ...data } = project;
    return {
      ...reference("project", project), ...data, actionCount: _count.actions,
      milestones: milestones.map((milestone) => ({ ...reference("milestone", { ...milestone, projectId: project.id }), ...milestone }))
    };
  }

  if (projectId) {
    const project = await getRoadmapProject(projectId);
    if (!project) throw new BusinessError("Projet introuvable.", 404);
    const actions = await getRoadmapActions(projectId, { limit: limit + 1, offset });
    return {
      project: projectSummary(project),
      actions: actions.slice(0, limit).map(({ owner, ownerName, ...action }) => ({ ...reference("action", action), ...action, ownerName: owner?.name ?? ownerName })),
      nextOffset: actions.length > limit ? offset + limit : null
    };
  }

  const projects = await getRoadmapProjects({ status, limit: limit + 1, offset });
  return {
    projects: projects.slice(0, limit).map(projectSummary),
    nextOffset: projects.length > limit ? offset + limit : null
  };
}

async function resolveProject(db: Db, name: string) {
  const candidates = await db.project.findMany({ where: { title: { contains: name } }, select: { id: true, title: true, status: true }, orderBy: { title: "asc" }, take: 30 });
  if (candidates.length !== 1) throw new BusinessError("Précisez le projet avec son identifiant.", 409, candidates);
  return candidates[0].id;
}

async function resolveMember(db: Db, name: string) {
  const candidates = await db.user.findMany({ where: { OR: [{ name: { contains: name } }, { email: name }] }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" }, take: 30 });
  if (candidates.length !== 1) throw new BusinessError("Précisez le responsable avec son identifiant.", 409, candidates);
  return candidates[0].id;
}

export async function writeBusiness(db: Db, actor: Actor, rawEntity: unknown, payload: unknown, id?: string) {
  const entity = entityName.parse(rawEntity);
  if (entity === "member") throw new BusinessError("Administration réservée à l’interface.", 403);
  const schema = entities[entity] as z.ZodObject;
  const fields = (id && entity !== "control" ? patchSchema(schema) : schema).strict().parse(payload);
  if (id && !Object.keys(fields).length) throw new BusinessError("Fournissez au moins un champ à modifier.");
  if (typeof fields.projectName === "string" && !fields.projectId) fields.projectId = await resolveProject(db, fields.projectName);
  delete fields.projectName;
  if ((entity === "project" || entity === "action") && typeof fields.ownerName === "string" && fields.ownerName && !fields.ownerId) {
    fields.ownerId = await resolveMember(db, fields.ownerName);
  }
  if (entity === "project") delete fields.ownerName;
  const row = await persist(db, actor, entity, fields, id);
  return { ...reference(entity, row), version: digest(canonical(row)), data: businessData(entity, row) };
}

async function persist(db: Db, actor: Actor, entity: Editable, fields: Record<string, unknown>, id?: string) {
  switch (entity) {
    case "page": return saveWorkspacePage(db, actor, fields, id);
    case "action": return id ? updateAction(id, patchSchema(entities.action).parse(fields), db, actor) : createAction(entities.action.parse(fields), db, actor);
    case "objective": return saveObjective(fields, id, db);
    case "project": return id ? updateProject(id, patchSchema(entities.project).parse(fields), db) : createProject(entities.project.parse(fields), db);
    case "milestone": return saveMilestone(fields, id, db);
    case "service": return saveService(fields, id, db);
    case "control": return recordControl(fields, actor, db, id);
    case "risk": return id ? updateRisk(id, fields, db) : createRisk(entities.risk.parse(fields), db);
    case "decision": return id ? updateDecision(id, fields, db) : createDecision(entities.decision.parse(fields), db);
    case "vendor": return id ? updateVendor(id, entities.vendor.partial().parse(fields), db) : createVendor(vendorSchema.parse(fields), db);
    case "contract": return id ? updateContract(id, patchSchema(entities.contract).parse(fields), db) : createContract(entities.contract.parse(fields), db);
    case "budget": return id ? updateBudgetItem(id, entities.budget.partial().parse(fields), db) : createBudgetItem(entities.budget.parse(fields), db);
    case "meeting": return id ? updateMeetingNote(id, patchSchema(entities.meeting).parse(fields), db) : createMeetingNote(entities.meeting.parse(fields), db);
    case "communication": return id ? updateCommunication(id, patchSchema(entities.communication).parse(fields), db) : createCommunication(entities.communication.parse(fields), db);
    case "report": {
      const report = await saveMonthlyDraft(id ? { ...fields, month: id } : fields, db);
      return { ...report, content: reportContent(report) };
    }
  }
}

export async function saveMeetingBatch(db: Db, actor: Actor, input: z.infer<typeof meetingBatch>) {
  const meeting = await writeBusiness(db, actor, "meeting", input.meeting);
  const projectId = (meeting.data as { projectId?: string | null }).projectId;
  const linked = [meeting];
  for (const [entity, rows] of [["action", input.actions], ["risk", input.risks], ["decision", input.decisions]] as const) {
    for (const data of rows) {
      const fields = data.projectId || data.projectName ? data : { ...data, projectId };
      const result = await writeBusiness(db, actor, entity, fields);
      const where = { id: result.id };
      const relation = { meetingNoteId: meeting.id };
      if (entity === "action") await db.action.update({ where, data: relation });
      if (entity === "risk") await db.risk.update({ where, data: relation });
      if (entity === "decision") await db.decision.update({ where, data: relation });
      linked.push({ ...result, data: { ...result.data, ...relation } });
    }
  }
  return linked;
}
