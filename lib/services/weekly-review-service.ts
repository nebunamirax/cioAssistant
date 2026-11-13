import { prisma } from "@/lib/db/prisma";
import { controlState, staleSync } from "./support-service";

export const reviewCategories = ["Actions", "Prestataires", "Contrôles critiques", "Préavis", "Arbitrages"] as const;
type ReviewItem = {
  id: string; title: string; owner: string; category: typeof reviewCategories[number]; reasons: string[]; href: string;
};

export async function weeklyReview(now = new Date()) {
  const sevenDays = new Date(now.getTime() + 7 * 86400000);
  const thirtyDays = new Date(now.getTime() + 30 * 86400000);
  const [actions, external, services, contracts, decisions] = await Promise.all([
    prisma.action.findMany({ where: { status: { not: "DONE" }, OR: [{ status: "BLOCKED" }, { dueDate: { lte: sevenDays } }] }, include: { owner: { select: { name: true } } } }),
    prisma.externalItem.findMany({ where: { status: { not: "DONE" }, source: { kind: "TICKET_CSV" }, OR: [{ status: "BLOCKED" }, { major: true }, { dueDate: { lt: now } }] },
      include: { source: { include: { service: { include: { owner: { select: { name: true } } } }, project: { include: { owner: { select: { name: true } } } } } } } }),
    prisma.supportService.findMany({ where: { criticality: { in: ["HIGH", "CRITICAL"] } }, include: { owner: { select: { name: true } },
      controls: { orderBy: [{ checkedAt: "desc" }, { createdAt: "desc" }], take: 1 } } }),
    prisma.contract.findMany({ where: { status: "ACTIVE", endDate: { not: null }, noticePeriodDays: { not: null } },
      include: { project: { include: { owner: { select: { name: true } } } } } }),
    prisma.decision.findMany({ where: { status: "PENDING" } })
  ]);
  const unassigned = "Sans responsable";
  const items: ReviewItem[] = [];
  for (const a of actions) items.push({
    id: a.id, title: a.title, category: "Actions", owner: a.owner?.name ?? a.ownerName ?? unassigned,
    href: `/actions?selectedId=${a.id}`,
    reasons: [...(a.status === "BLOCKED" ? ["Bloquée"] : []), ...(a.dueDate && a.dueDate <= sevenDays ? [a.dueDate < now ? "Échue" : "Due sous sept jours"] : [])]
  });
  for (const item of external) {
    const { service, project } = item.source;
    items.push({
      id: item.id, title: `${item.externalId} · ${item.title}`, category: "Prestataires",
      owner: service?.owner?.name ?? project?.owner?.name ?? (item.assignees || unassigned),
      href: service ? `/services/${service.id}#${item.id}` : `/projects/${project?.id}#${item.id}`,
      reasons: [...(item.status === "BLOCKED" ? ["Bloqué"] : []), ...(item.major ? ["Majeur"] : []),
        ...(item.dueDate && item.dueDate < now ? ["Échu"] : []), ...(staleSync(item.lastSyncedAt, now) ? ["Données anciennes"] : [])]
    });
  }
  for (const service of services) {
    const control = service.controls[0];
    const reasons = controlState(control, now);
    if (reasons[0] === "Contrôle à jour") {
      if (!control || control.nextDueAt > sevenDays) continue;
      reasons[0] = "Contrôle dû sous sept jours";
    }
    items.push({ id: service.id, title: service.title, category: "Contrôles critiques", owner: service.owner?.name ?? unassigned, href: `/services/${service.id}`, reasons });
  }
  for (const contract of contracts) {
    if (!contract.endDate || contract.noticePeriodDays === null) continue;
    const notice = new Date(contract.endDate.getTime() - contract.noticePeriodDays * 86400000);
    if (notice > thirtyDays) continue;
    items.push({ id: contract.id, title: contract.title, category: "Préavis", owner: contract.project?.owner?.name ?? unassigned,
      href: `/contracts/${contract.id}`, reasons: [notice < now ? "Préavis dépassé" : "Préavis sous trente jours"] });
  }
  for (const decision of decisions) items.push({ id: decision.id, title: decision.subject, category: "Arbitrages", owner: decision.decider ?? unassigned,
    href: `/decisions#${decision.id}`, reasons: ["Décision attendue", ...(decision.targetDate && decision.targetDate < now ? ["Échue"] : [])] });
  return items.sort((a, b) => reviewCategories.indexOf(a.category) - reviewCategories.indexOf(b.category) || a.title.localeCompare(b.title, "fr"));
}
