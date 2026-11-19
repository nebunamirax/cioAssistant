import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { publicUrl } from "@/lib/auth/session";
import { BusinessError } from "@/lib/business/error";
import { workspaceListFields, workspacePageFields, workspaceViewReadFields, workspaceViews } from "@/lib/validation/workspace";
import { workspaceContent } from "@/lib/workspace/document";

type Db = Prisma.TransactionClient;
type Actor = { id: string; name: string };

export function pageViews(row: { viewsJson: string }) {
  return workspaceViews.parse(JSON.parse(row.viewsJson));
}

export async function listWorkspacePages(input: z.infer<typeof workspaceListFields>, db: Db = prisma) {
  const { query, parentId, cursor, limit } = input;
  const rows = await db.workspacePage.findMany({
    where: {
      parentId,
      id: cursor ? { gt: cursor } : undefined,
      OR: query ? [{ title: { contains: query } }, { contentMarkdown: { contains: query } }] : undefined
    },
    select: { id: true, title: true, parentId: true, revision: true, updatedAt: true, editedByName: true },
    orderBy: { id: "asc" }, take: limit + 1
  });
  return {
    items: rows.slice(0, limit).map((row) => ({ ...row, url: new URL(`/workspace/${row.id}`, publicUrl()).href })),
    nextCursor: rows.length > limit ? rows[limit - 1].id : null
  };
}

export async function saveWorkspacePage(db: Db, actor: Actor, fields: Record<string, unknown>, id?: string) {
  const current = id ? await db.workspacePage.findUnique({ where: { id } }) : null;
  if (id && !current) throw new BusinessError("Page introuvable.", 404);
  const input = workspacePageFields.strict().parse(current
    ? { title: current.title, parentId: current.parentId, contentMarkdown: current.contentMarkdown, views: pageViews(current), ...fields }
    : fields);
  const visited = new Set(id ? [id] : []);
  let parentId = input.parentId;
  while (parentId) {
    if (visited.has(parentId)) throw new BusinessError("Ce déplacement créerait une boucle dans les sous-pages.", 409);
    visited.add(parentId);
    const parent = await db.workspacePage.findUnique({ where: { id: parentId }, select: { parentId: true } });
    if (!parent) throw new BusinessError("La page parente est introuvable.", 404);
    parentId = parent.parentId;
    if (visited.size > 32) throw new BusinessError("La hiérarchie dépasse 32 niveaux.");
  }
  const projectIds = [...new Set(input.views.map((view) => view.projectId).filter((value): value is string => Boolean(value)))];
  if (await db.project.count({ where: { id: { in: projectIds } } }) !== projectIds.length) {
    throw new BusinessError("Un projet de la vue est introuvable.", 404);
  }
  const { views, contentBlocks, ...page } = input;
  const content = !current || contentBlocks || fields.contentMarkdown !== undefined
    ? await workspaceContent(input.contentMarkdown, contentBlocks)
    : { contentMarkdown: current.contentMarkdown, blocksJson: current.blocksJson };
  const data = { ...page, ...content, viewsJson: JSON.stringify(views), editedById: actor.id, editedByName: actor.name };
  const saved = current
    ? await db.workspacePage.update({ where: { id: current.id }, data: { ...data, revision: { increment: 1 } } })
    : await db.workspacePage.create({ data });
  await db.workspaceRevision.create({ data: {
    pageId: saved.id, revision: saved.revision, title: saved.title, parentId: saved.parentId,
    contentMarkdown: saved.contentMarkdown, blocksJson: saved.blocksJson, viewsJson: saved.viewsJson, authorId: actor.id, authorName: actor.name
  } });
  return saved;
}

const viewModels = {
  project: { model: "project", title: "title", route: "/projects" },
  action: { model: "action", title: "title", route: "/actions" },
  risk: { model: "risk", title: "title", route: "/risks" },
  decision: { model: "decision", title: "subject", route: "/decisions" },
  contract: { model: "contract", title: "title", route: "/contracts" },
  budget: { model: "budgetItem", title: "title", route: "/budget" },
  meeting: { model: "meetingNote", title: "title", route: "/meetings" },
  service: { model: "supportService", title: "title", route: "/services" }
} as const;
type ViewRow = { id: string; title?: string; subject?: string; status?: string; dueDate?: Date; targetDate?: Date; meetingDate?: Date; endDate?: Date; priority?: string; criticality?: string };
type ViewDelegate = { findMany(args: object): Promise<ViewRow[]>; count(args: object): Promise<number> };

export async function readWorkspaceView(input: z.infer<typeof workspaceViewReadFields>, db: Db = prisma) {
  const { pageId, viewId, cursor, limit } = input;
  const page = await db.workspacePage.findUnique({ where: { id: pageId } });
  if (!page) throw new BusinessError("Page introuvable.", 404);
  const view = pageViews(page).find((item) => item.id === viewId);
  if (!view) throw new BusinessError("Vue introuvable.", 404);
  const config = viewModels[view.entity];
  const model = db[config.model] as unknown as ViewDelegate;
  const where = {
    [config.title]: view.query ? { contains: view.query } : undefined,
    ...(view.projectId ? { [view.entity === "project" ? "id" : "projectId"]: view.projectId } : {}),
    ...(!["budget", "meeting", "service"].includes(view.entity) && view.status ? { status: view.status } : {})
  };
  const [rows, total] = await Promise.all([
    model.findMany({ where: { AND: [where, { id: cursor ? { gt: cursor } : undefined }] }, orderBy: { id: "asc" }, take: limit + 1 }),
    model.count({ where })
  ]);
  return {
    view, total,
    items: rows.slice(0, limit).map((row) => {
      let href = `${config.route}/${row.id}`;
      if (view.entity === "action" || view.entity === "meeting") href = `${config.route}?selectedId=${row.id}`;
      if (view.entity === "risk" || view.entity === "decision") href = `${config.route}#${row.id}`;
      return {
        id: row.id, title: row.title ?? row.subject ?? "", status: row.status ?? "",
        priority: row.priority ?? row.criticality ?? "",
        date: row.dueDate ?? row.targetDate ?? row.meetingDate ?? row.endDate ?? null,
        url: new URL(href, publicUrl()).href
      };
    }),
    nextCursor: rows.length > limit ? rows[limit - 1].id : null
  };
}
