import { prisma } from "@/lib/db/prisma";
import type { z } from "zod";
import type { cmdbFiltersSchema } from "@/lib/validation/cmdb";

const itemSummary = { id: true, name: true, reference: true, type: true, status: true } as const;

const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("fr");

export async function listConfigurationItems({ q, ...filters }: z.infer<typeof cmdbFiltersSchema>) {
  const items = await prisma.configurationItem.findMany({
    where: filters,
    select: {
      ...itemSummary,
      environment: true,
      criticality: true,
      owner: true,
      service: { select: { id: true, title: true } },
      vendor: { select: { id: true, name: true } }
    },
    orderBy: [{ name: "asc" }, { id: "asc" }]
  });
  const query = normalize(q);
  return query ? items.filter((item) => [item.name, item.reference, item.owner, item.service?.title, item.vendor?.name]
    .some((value) => value && normalize(value).includes(query))) : items;
}

export function getConfigurationItem(id: string) {
  return prisma.configurationItem.findUnique({
    where: { id },
    include: {
      service: { select: { id: true, title: true } },
      vendor: { select: { id: true, name: true } },
      outgoing: { include: { target: { select: itemSummary } }, orderBy: [{ type: "asc" }, { target: { name: "asc" } }] },
      incoming: { include: { source: { select: itemSummary } }, orderBy: [{ type: "asc" }, { source: { name: "asc" } }] }
    }
  });
}

export async function configurationOptions() {
  const [services, vendors] = await Promise.all([
    prisma.supportService.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
    prisma.vendor.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
  ]);
  return { services, vendors };
}

export function configurationTargets(id: string) {
  return prisma.configurationItem.findMany({
    where: { id: { not: id } },
    select: itemSummary,
    orderBy: [{ name: "asc" }, { id: "asc" }]
  });
}
