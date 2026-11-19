import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { currentMember } from "@/lib/auth/session";
import { normalizeSearchText } from "@/lib/domain/search-text";
import { prisma } from "@/lib/db/prisma";

const querySchema = z.string().trim().min(2).max(120);
const batchSize = 100;
const resultLimit = 6;

type Batch = { cursor?: { id: string }; skip?: number; take: number; orderBy: [{ updatedAt: "desc" }, { id: "desc" }] };

async function searchRows<T extends { id: string }>(
  query: string,
  read: (batch: Batch) => Prisma.PrismaPromise<T[]>,
  fields: (row: T) => (string | null)[]
) {
  const matches: T[] = [];
  let cursor: string | undefined;
  while (matches.length < resultLimit) {
    const rows = await read({
      take: batchSize, orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
    });
    matches.push(...rows.filter((row) => fields(row).some((field) => field && normalizeSearchText(field).includes(query))));
    if (rows.length < batchSize) break;
    cursor = rows.at(-1)?.id;
  }
  return matches.slice(0, resultLimit);
}

async function searchGovernance(query: string) {
  const [pages, decisions, risks, items] = await Promise.all([
    searchRows(query, (batch) => prisma.workspacePage.findMany({
      ...batch, select: { id: true, title: true, contentMarkdown: true }
    }), (page) => [page.title, page.contentMarkdown]),
    searchRows(query, (batch) => prisma.decision.findMany({
      ...batch, select: { id: true, subject: true }
    }), (decision) => [decision.subject]),
    searchRows(query, (batch) => prisma.risk.findMany({
      ...batch, select: { id: true, title: true }
    }), (risk) => [risk.title]),
    searchRows(query, (batch) => prisma.configurationItem.findMany({
      ...batch, select: { id: true, name: true, reference: true }
    }), (item) => [item.name, item.reference])
  ]);

  return [
    ...pages.map(({ id, title }) => ({ title, kind: "page", detail: "Page", href: `/workspace/${encodeURIComponent(id)}` })),
    ...decisions.map(({ id, subject }) => ({ title: subject, kind: "decision", detail: "Décision", href: `/decisions#${encodeURIComponent(id)}` })),
    ...risks.map(({ id, title }) => ({ title, kind: "risk", detail: "Risque", href: `/risks#${encodeURIComponent(id)}` })),
    ...items.map(({ id, name, reference }) => ({ title: name, kind: "cmdb", detail: reference ?? "Élément du SI", href: `/cmdb/${encodeURIComponent(id)}` }))
  ];
}

export async function GET(request: Request) {
  const member = await currentMember();
  if (!member) return Response.json({ error: "Connexion requise." }, { status: 401 });
  const input = querySchema.safeParse(new URL(request.url).searchParams.get("q"));
  const query = input.success ? normalizeSearchText(input.data) : "";
  if (query.length < 2) return Response.json({ error: "Saisissez entre 2 et 120 caractères." }, { status: 400 });

  const dsi = member.role === "DSI";
  const [projects, actions, services, governance] = await Promise.all([
    searchRows(query, (batch) => prisma.project.findMany({
      ...batch, where: dsi ? undefined : { status: { not: "CANCELLED" } }, select: { id: true, title: true }
    }), (project) => [project.title]),
    searchRows(query, (batch) => prisma.action.findMany({
      ...batch, select: { id: true, title: true, project: { select: { title: true } } }
    }), (action) => [action.title]),
    searchRows(query, (batch) => prisma.supportService.findMany({
      ...batch, select: { id: true, title: true }
    }), (service) => [service.title]),
    dsi ? searchGovernance(query) : []
  ]);

  return Response.json({
    data: [
      ...projects.map(({ id, title }) => ({
        title, kind: "project", detail: "Projet",
        href: dsi ? `/projects/${encodeURIComponent(id)}` : `/roadmap?project=${encodeURIComponent(id)}`
      })),
      ...actions.map(({ id, title, project }) => ({
        title, kind: "action", detail: project?.title ?? "Action",
        href: `/actions?selectedId=${encodeURIComponent(id)}`
      })),
      ...services.map(({ id, title }) => ({ title, kind: "service", detail: "Service", href: `/services/${encodeURIComponent(id)}` })),
      ...governance
    ]
  }, { headers: { "Cache-Control": "no-store" } });
}
