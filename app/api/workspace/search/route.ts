import { z } from "zod";
import { currentMember } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { listWorkspacePages } from "@/lib/services/workspace-service";

const querySchema = z.string().trim().min(2).max(120);

async function searchGovernance(query: string) {
  const [pages, decisions, risks] = await Promise.all([
    listWorkspacePages({ query, limit: 6 }),
    prisma.decision.findMany({
      where: { subject: { contains: query } },
      select: { id: true, subject: true },
      orderBy: { updatedAt: "desc" },
      take: 6
    }),
    prisma.risk.findMany({
      where: { title: { contains: query } },
      select: { id: true, title: true },
      orderBy: { updatedAt: "desc" },
      take: 6
    })
  ]);

  return [
    ...pages.items.map(({ id, title }) => ({ title, kind: "page", detail: "Page", href: `/workspace/${encodeURIComponent(id)}` })),
    ...decisions.map(({ id, subject }) => ({ title: subject, kind: "decision", detail: "Décision", href: `/decisions#${encodeURIComponent(id)}` })),
    ...risks.map(({ id, title }) => ({ title, kind: "risk", detail: "Risque", href: `/risks#${encodeURIComponent(id)}` }))
  ];
}

export async function GET(request: Request) {
  const member = await currentMember();
  if (!member) return Response.json({ error: "Connexion requise." }, { status: 401 });
  const query = querySchema.safeParse(new URL(request.url).searchParams.get("q"));
  if (!query.success) return Response.json({ error: "Saisissez entre 2 et 120 caractères." }, { status: 400 });

  const dsi = member.role === "DSI";
  const [projects, actions, governance] = await Promise.all([
    prisma.project.findMany({
      where: { title: { contains: query.data }, ...(dsi ? {} : { status: { not: "CANCELLED" } }) },
      select: { id: true, title: true },
      orderBy: { updatedAt: "desc" },
      take: 6
    }),
    prisma.action.findMany({
      where: { title: { contains: query.data } },
      select: { id: true, title: true, project: { select: { title: true } } },
      orderBy: { updatedAt: "desc" },
      take: 6
    }),
    dsi ? searchGovernance(query.data) : []
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
      ...governance
    ]
  }, { headers: { "Cache-Control": "no-store" } });
}
