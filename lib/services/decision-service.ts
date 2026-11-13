import { type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { decisionFilterSchema, decisionSchema, type DecisionFilters, type DecisionInput } from "@/lib/validation/decision";

function toNullableDate(value?: string | null) {
  return value ? new Date(value) : null;
}

function normalizeOptionalString(value?: string | null) {
  if (value === undefined) return undefined;
  return value === "" ? null : value;
}

function buildDecisionCreateData(input: DecisionInput): Prisma.DecisionUncheckedCreateInput {
  return {
    subject: input.subject,
    context: normalizeOptionalString(input.context ?? null),
    optionsJson: input.options.length > 0 ? JSON.stringify(input.options) : null,
    recommendation: normalizeOptionalString(input.recommendation ?? null),
    decider: normalizeOptionalString(input.decider ?? null),
    status: input.status,
    targetDate: toNullableDate(input.targetDate),
    projectId: normalizeOptionalString(input.projectId),
    contractId: normalizeOptionalString(input.contractId),
    budgetItemId: normalizeOptionalString(input.budgetItemId)
  };
}

export async function listDecisions(filters?: DecisionFilters) {
  const validatedFilters = decisionFilterSchema.parse(filters ?? {});
  const where: Prisma.DecisionWhereInput = {
    ...(validatedFilters.search
      ? {
          OR: [
            { subject: { contains: validatedFilters.search } },
            { context: { contains: validatedFilters.search } },
            { recommendation: { contains: validatedFilters.search } },
            { decider: { contains: validatedFilters.search } }
          ]
        }
      : {}),
    ...(validatedFilters.status ? { status: validatedFilters.status } : {}),
    ...(validatedFilters.projectId ? { projectId: validatedFilters.projectId } : {})
  };

  return prisma.decision.findMany({
    where,
    include: { project: true, contract: true, budgetItem: true },
    orderBy: [{ targetDate: "asc" }, { updatedAt: "desc" }]
  });
}

export async function createDecision(payload: DecisionInput, db: Prisma.TransactionClient = prisma) {
  const validated = decisionSchema.parse(payload);
  return db.decision.create({
    data: buildDecisionCreateData(validated)
  });
}

export function parseDecisionOptions(optionsJson?: string | null) {
  if (!optionsJson) return [];

  try {
    const parsed = JSON.parse(optionsJson);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}


export async function updateDecision(id: string, payload: unknown, db: Prisma.TransactionClient = prisma) {
  const patch = decisionSchema.partial().strict().parse(payload);
  const existing = await db.decision.findUniqueOrThrow({ where: { id } });
  const data = buildDecisionCreateData(decisionSchema.parse({
    ...existing,
    targetDate: existing.targetDate?.toISOString(), options: parseDecisionOptions(existing.optionsJson),
    ...patch
  }));
  return db.decision.update({ where: { id }, data });
}
