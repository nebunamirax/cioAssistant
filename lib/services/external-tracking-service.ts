import { prisma } from "@/lib/db/prisma";
import type { ExternalItemInput } from "@/lib/domain/external-tracking";

export async function saveExternalItems(source: {
  kind: "PLANNER" | "TICKET_CSV";
  key: string;
  title: string;
  projectId?: string | null;
  serviceId?: string | null;
  statusMappings?: string;
}, items: ExternalItemInput[], preserve: (keyof ExternalItemInput)[] = []) {
  const lastSyncedAt = new Date();

  return prisma.$transaction(async (db) => {
    const saved = await db.externalSource.upsert({
      where: { kind_key: { kind: source.kind, key: source.key } },
      create: { ...source, lastSyncedAt },
      update: { title: source.title, projectId: source.projectId, serviceId: source.serviceId, statusMappings: source.statusMappings, lastSyncedAt }
    });

    for (const item of items) {
      const data = { ...item, sourceId: saved.id, lastSyncedAt };
      const update = { ...data };
      for (const field of preserve) delete (update as Partial<ExternalItemInput>)[field];
      await db.externalItem.upsert({
        where: { sourceId_externalId: { sourceId: saved.id, externalId: item.externalId } },
        create: data,
        update
      });
    }

    if (source.kind === "PLANNER") {
      await db.externalItem.deleteMany({
        where: { sourceId: saved.id, lastSyncedAt: { not: lastSyncedAt } }
      });
    }
    return { count: items.length, lastSyncedAt };
  }, { timeout: 30000 });
}

export function listProjectExternalItems(projectId: string, sourceId?: string, status?: string) {
  return prisma.externalItem.findMany({
    where: { source: { projectId }, sourceId, status },
    include: { source: true, followUp: { select: { id: true } } },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { title: "asc" }]
  });
}

export function listExternalAttention(now = new Date(), take: number | null = 10) {
  const context = { select: { id: true, title: true, owner: { select: { name: true } } } };
  return prisma.externalItem.findMany({
    where: {
      status: { not: "DONE" }, OR: [{ status: "BLOCKED" }, { dueDate: { lt: now } }, { major: true }]
    },
    include: { source: { include: { project: context, service: context } } },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { title: "asc" }],
    take: take ?? undefined
  });
}

export function externalAttentionLabel(item: { status: string; dueDate: Date | null; major?: boolean }, now: Date) {
  return [
    item.status === "BLOCKED" && "Bloqué",
    item.dueDate && item.dueDate < now && "En retard",
    item.major && "Majeur"
  ].filter(Boolean).join(" · ");
}
