import { patchSchema } from "@/lib/validation/patch-schema";
import { type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { riskFilterSchema, riskSchema, type RiskFilters, type RiskInput } from "@/lib/validation/risk";

function toNullableDate(value?: string | null) {
  return value ? new Date(value) : null;
}

function normalizeOptionalString(value?: string | null) {
  if (value === undefined) return undefined;
  return value === "" ? null : value;
}

function buildRiskCreateData(input: RiskInput): Prisma.RiskUncheckedCreateInput {
  return {
    title: input.title,
    description: normalizeOptionalString(input.description ?? null),
    impact: input.impact,
    probability: input.probability,
    criticality: input.criticality,
    status: input.status,
    mitigation: normalizeOptionalString(input.mitigation ?? null),
    projectId: normalizeOptionalString(input.projectId),
    vendorId: normalizeOptionalString(input.vendorId),
    ownerName: normalizeOptionalString(input.ownerName),
    dueDate: toNullableDate(input.dueDate)
  };
}

export async function listRisks(filters?: RiskFilters) {
  const validatedFilters = riskFilterSchema.parse(filters ?? {});
  const where: Prisma.RiskWhereInput = {
    ...(validatedFilters.search
      ? {
          OR: [
            { title: { contains: validatedFilters.search } },
            { description: { contains: validatedFilters.search } },
            { mitigation: { contains: validatedFilters.search } },
            { ownerName: { contains: validatedFilters.search } }
          ]
        }
      : {}),
    ...(validatedFilters.status ? { status: validatedFilters.status } : {}),
    ...(validatedFilters.criticality ? { criticality: validatedFilters.criticality } : {}),
    ...(validatedFilters.projectId ? { projectId: validatedFilters.projectId } : {})
  };

  return prisma.risk.findMany({
    where,
    include: { project: true, vendor: true },
    orderBy: [{ criticality: "desc" }, { dueDate: "asc" }, { updatedAt: "desc" }]
  });
}

export async function createRisk(payload: RiskInput, db: Prisma.TransactionClient = prisma) {
  const validated = riskSchema.parse(payload);
  return db.risk.create({
    data: buildRiskCreateData(validated)
  });
}


export async function updateRisk(id: string, payload: unknown, db: Prisma.TransactionClient = prisma) {
  const patch = patchSchema(riskSchema).strict().parse(payload);
  const existing = await db.risk.findUniqueOrThrow({ where: { id } });
  const data = buildRiskCreateData(riskSchema.parse({
    ...existing,
    dueDate: existing.dueDate?.toISOString(),
    ...patch
  }));
  return db.risk.update({ where: { id }, data });
}
