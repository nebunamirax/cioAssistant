import { prisma } from "@/lib/db/prisma";
import { controlState, staleSync } from "./support-service";
import { externalAttentionLabel, listExternalAttention } from "./external-tracking-service";

export const reviewCategories = ["Actions", "Arbitrages", "Risques", "Contrôles critiques", "Préavis", "Prestataires", "Planner"] as const;
export type ReviewItem = {
  id: string;
  title: string;
  owner: string;
  category: typeof reviewCategories[number];
  reasons: string[];
  href: string;
  urgency: "urgent" | "attention";
  dueDate: Date | null;
  context?: string;
  sourceUrl?: string;
};

export async function weeklyReview(now = new Date()) {
  const sevenDays = new Date(now.getTime() + 7 * 86400000);
  const thirtyDays = new Date(now.getTime() + 30 * 86400000);
  const projectTitle = { select: { title: true } };
  const [actions, external, services, contracts, decisions, risks] = await Promise.all([
    prisma.action.findMany({
      where: { status: { not: "DONE" }, OR: [{ status: "BLOCKED" }, { priority: "CRITICAL" }, { dueDate: { lte: sevenDays } }] },
      include: { owner: { select: { name: true } }, project: projectTitle, service: projectTitle }
    }),
    listExternalAttention(now, null),
    prisma.supportService.findMany({ where: { criticality: { in: ["HIGH", "CRITICAL"] } }, include: { owner: { select: { name: true } },
      controls: { orderBy: [{ checkedAt: "desc" }, { createdAt: "desc" }], take: 1 } } }),
    prisma.contract.findMany({ where: { status: "ACTIVE", endDate: { not: null }, noticePeriodDays: { not: null } },
      include: { project: { include: { owner: { select: { name: true } } } } } }),
    prisma.decision.findMany({ where: { status: "PENDING" }, include: { project: projectTitle } }),
    prisma.risk.findMany({ where: { status: { in: ["OPEN", "MITIGATING"] }, criticality: { in: ["HIGH", "CRITICAL"] } }, include: { project: projectTitle } })
  ]);
  const unassigned = "Sans responsable";
  const items: ReviewItem[] = [];
  for (const a of actions) items.push({
    id: a.id, title: a.title, category: "Actions", owner: a.owner?.name ?? a.ownerName ?? unassigned,
    href: `/actions?selectedId=${encodeURIComponent(a.id)}`,
    dueDate: a.dueDate, context: a.project?.title ?? a.service?.title,
    urgency: a.status === "BLOCKED" || a.priority === "CRITICAL" || (a.dueDate && a.dueDate < now) ? "urgent" : "attention",
    reasons: [...(a.status === "BLOCKED" ? ["Bloquée"] : []), ...(a.priority === "CRITICAL" ? ["Critique"] : []),
      ...(a.dueDate && a.dueDate <= sevenDays ? [a.dueDate < now ? "Échue" : "Due sous sept jours"] : [])]
  });
  for (const item of external) {
    const { service, project } = item.source;
    items.push({
      id: item.id, title: `${item.externalId} · ${item.title}`, category: item.source.kind === "PLANNER" ? "Planner" : "Prestataires",
      owner: service?.owner?.name ?? project?.owner?.name ?? (item.assignees || unassigned),
      href: service ? `/services/${service.id}#${item.id}` : project ? `/projects/${project.id}#${item.id}` : "/settings/integrations",
      dueDate: item.dueDate, context: item.source.title, sourceUrl: item.url ?? undefined,
      urgency: "urgent",
      reasons: [externalAttentionLabel(item, now), ...(staleSync(item.lastSyncedAt, now) ? ["Données anciennes"] : [])]
    });
  }
  for (const service of services) {
    const control = service.controls[0];
    const reasons = controlState(control, now);
    if (reasons[0] === "Contrôle à jour") {
      if (!control || control.nextDueAt > sevenDays) continue;
      reasons[0] = "Contrôle dû sous sept jours";
    }
    items.push({ id: service.id, title: service.title, category: "Contrôles critiques", owner: service.owner?.name ?? unassigned,
      href: `/services/${service.id}`, dueDate: control?.nextDueAt ?? null, reasons,
      urgency: !control || control.result === "ANOMALY" || control.nextDueAt < now ? "urgent" : "attention" });
  }
  for (const contract of contracts) {
    if (!contract.endDate || contract.noticePeriodDays === null) continue;
    const notice = new Date(contract.endDate.getTime() - contract.noticePeriodDays * 86400000);
    if (notice > thirtyDays) continue;
    items.push({ id: contract.id, title: contract.title, category: "Préavis", owner: contract.project?.owner?.name ?? unassigned,
      href: `/contracts/${contract.id}`, dueDate: notice, urgency: notice < now ? "urgent" : "attention",
      reasons: [notice < now ? "Préavis dépassé" : "Préavis sous trente jours"] });
  }
  for (const decision of decisions) items.push({ id: decision.id, title: decision.subject, category: "Arbitrages", owner: decision.decider ?? unassigned,
    href: `/decisions#${decision.id}`, context: decision.project?.title, dueDate: decision.targetDate,
    urgency: decision.targetDate && decision.targetDate < now ? "urgent" : "attention",
    reasons: ["Décision attendue", ...(decision.targetDate && decision.targetDate < now ? ["Échue"] : [])] });
  for (const risk of risks) items.push({ id: risk.id, title: risk.title, category: "Risques", owner: risk.ownerName ?? unassigned,
    href: `/risks#${risk.id}`, context: risk.project?.title, dueDate: risk.dueDate,
    urgency: risk.criticality === "CRITICAL" || (risk.dueDate && risk.dueDate < now) ? "urgent" : "attention",
    reasons: [risk.criticality === "CRITICAL" ? "Risque critique" : "Risque élevé", ...(risk.dueDate && risk.dueDate < now ? ["Échu"] : [])] });
  return items.sort((a, b) => Number(b.urgency === "urgent") - Number(a.urgency === "urgent") ||
    (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity) ||
    a.title.localeCompare(b.title, "fr") || a.id.localeCompare(b.id));
}
