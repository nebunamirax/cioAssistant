import type { Prisma } from "@prisma/client";
import { serviceFields, controlFields } from "@/lib/validation/support";
import { prisma } from "@/lib/db/prisma";

export async function saveService(input: unknown, id?: string, db: Prisma.TransactionClient = prisma) {
  if (id) return db.supportService.update({ where: { id }, data: serviceFields.partial().parse(input) });
  return db.supportService.create({ data: serviceFields.parse(input) });
}

export async function recordControl(input: unknown, actor: { id: string; name: string }, db: Prisma.TransactionClient = prisma, id?: string) {
  const data = controlFields.parse(input);
  if (new Date(data.nextDueAt) <= new Date(data.checkedAt)) throw new Error("L’échéance doit suivre la date du contrôle.");
  if (id) {
    const previous = await db.serviceControl.findUniqueOrThrow({ where: { id } });
    if (data.serviceId !== previous.serviceId) throw new Error("Le service d’un contrôle enregistré est fixe.");
    // Append the correction and retain the original observation.
  }
  return db.serviceControl.create({ data: { ...data, authorId: actor.id, authorName: actor.name } });
}

export function controlState(control?: { nextDueAt: Date; result: string }, now = new Date()) {
  if (!control) return ["Absence de contrôle"];
  const reasons = [];
  if (control.result === "ANOMALY") reasons.push("Anomalie");
  if (control.nextDueAt < now) reasons.push("Contrôle en retard");
  return reasons.length ? reasons : ["Contrôle à jour"];
}

export function followUp(db: Prisma.TransactionClient, actor: { id: string; name: string }, serviceId?: string, ticketId?: string) {
  if (ticketId) return followUpTicket(db, actor, ticketId);
  return db.supportService.findUniqueOrThrow({ where: { id: serviceId } }).then((service) =>
    db.action.create({ data: { title: `Relancer · ${service.title}`, serviceId: service.id, vendorId: service.vendorId,
      contractId: service.contractId, ownerId: actor.id, ownerName: actor.name, sourceType: "SERVICE", sourceRef: service.id } }));
}

async function followUpTicket(db: Prisma.TransactionClient, actor: { id: string; name: string }, id: string) {
  const ticket = await db.externalItem.findUniqueOrThrow({ where: { id }, include: { source: true } });
  return db.action.upsert({
    where: { externalItemId: id },
    update: {},
    create: { title: `Relancer · ${ticket.title}`, externalItemId: id, ownerId: actor.id, ownerName: actor.name,
      projectId: ticket.source.projectId, serviceId: ticket.source.serviceId, sourceType: "TICKET_CSV",
      sourceRef: ticket.externalId, sourceUrl: ticket.url }
  });
}

export function staleSync(date: Date | null, now = new Date()) {
  return !date || now.getTime() - date.getTime() > 7 * 86400000;
}
