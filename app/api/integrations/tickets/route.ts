import { NextResponse } from "next/server";
import { z } from "zod";
import type { ExternalItemInput } from "@/lib/domain/external-tracking";
import { prisma } from "@/lib/db/prisma";
import { saveExternalItems } from "@/lib/services/external-tracking-service";
import { maxTicketCsvSize, parseTicketCsv, previewTicketCsv, ticketMappingSchema, ticketStatusMappingsSchema } from "@/lib/services/ticket-csv";

const fields = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("inspect"), csv: z.string().max(maxTicketCsvSize) }),
  z.object({
    mode: z.enum(["preview", "import"]),
    csv: z.string().max(maxTicketCsvSize),
    mapping: ticketMappingSchema,
    statuses: ticketStatusMappingsSchema.default([]),
    projectId: z.string().min(1).max(250).optional(),
    serviceId: z.string().min(1).max(250).optional(),
    sourceName: z.string().trim().min(1).max(100)
  })
]);

export async function POST(request: Request) {
  const input = fields.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Vérifie le fichier, le projet et les colonnes sélectionnées." }, { status: 400 });

  const payload = input.data;
  try {
    const csv = parseTicketCsv(payload.csv);
    if (payload.mode === "inspect") return NextResponse.json({
      data: { headers: csv.headers, count: csv.rows.length }
    });

    const { projectId, serviceId, sourceName, mapping } = payload;
    if (Boolean(projectId) === Boolean(serviceId)) return NextResponse.json({ error: "Choisissez un projet ou un service." }, { status: 400 });
    const target = projectId
      ? await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } })
      : await prisma.supportService.findUnique({ where: { id: serviceId }, select: { id: true } });
    if (!target) return NextResponse.json({ error: "Cible introuvable." }, { status: 404 });
    const key = JSON.stringify([projectId ?? `service:${serviceId}`, sourceName.toLocaleLowerCase("fr")]);
    const current = await prisma.externalSource.findUnique({
      where: { kind_key: { kind: "TICKET_CSV", key } },
      select: { statusMappings: true }
    });
    const savedMappings = ticketStatusMappingsSchema.parse(JSON.parse(current?.statusMappings ?? "[]"));
    const statusMap = new Map([...savedMappings, ...payload.statuses].map(({ original, status }) => [original, status]));
    const statuses = Array.from(statusMap, ([original, status]) => ({ original, status }));
    if (!ticketStatusMappingsSchema.safeParse(statuses).success) {
      return NextResponse.json({ error: "Cette source dépasse la limite de statuts distincts." }, { status: 400 });
    }
    const preview = previewTicketCsv(csv, mapping, statuses);
    if (payload.mode === "preview") return NextResponse.json({
      data: { count: preview.items.length, errors: preview.errors, statuses: preview.statuses, sample: preview.items.slice(0, 5), mappings: statuses }
    });
    if (preview.errors.length) return NextResponse.json({ error: "Corrige les lignes signalées avant de confirmer l’import." }, { status: 422 });

    const preserve: (keyof ExternalItemInput)[] = [];
    if (mapping.status === undefined) preserve.push("status", "originalStatus");
    for (const field of ["priority", "assignees", "dueDate", "url"] as const) {
      if (mapping[field] === undefined) preserve.push(field);
    }
    try {
      const data = await saveExternalItems({
        kind: "TICKET_CSV", key, title: sourceName, projectId, serviceId, statusMappings: JSON.stringify(statuses)
      }, preview.items, preserve);
      return NextResponse.json({ data });
    } catch {
      return NextResponse.json({ error: "Import interrompu. Réessaie avec le même fichier." }, { status: 409 });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Fichier CSV invalide." }, { status: 400 });
  }
}
