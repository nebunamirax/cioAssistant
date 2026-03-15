import { type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  budgetItemFilterSchema,
  budgetItemSchema,
  budgetItemUpdateSchema,
  type BudgetItemFilters,
  type BudgetItemInput,
  type BudgetItemUpdateInput
} from "@/lib/validation/budget-item";

function normalizeOptionalString(value?: string | null) {
  if (value === undefined) return undefined;
  return value === "" ? null : value;
}

function normalizeOptionalNumber(value?: number | null) {
  if (value === undefined) return undefined;
  return value === null ? null : value;
}

function buildBudgetItemCreateData(input: BudgetItemInput): Prisma.BudgetItemUncheckedCreateInput {
  return {
    title: input.title,
    category: normalizeOptionalString(input.category ?? null),
    projectId: normalizeOptionalString(input.projectId),
    contractId: normalizeOptionalString(input.contractId),
    vendorId: normalizeOptionalString(input.vendorId),
    fiscalYear: normalizeOptionalNumber(input.fiscalYear ?? null),
    plannedAmount: normalizeOptionalNumber(input.plannedAmount ?? null),
    committedAmount: normalizeOptionalNumber(input.committedAmount ?? null),
    estimatedActualAmount: normalizeOptionalNumber(input.estimatedActualAmount ?? null),
    notes: normalizeOptionalString(input.notes ?? null)
  };
}

function buildBudgetItemUpdateData(input: BudgetItemUpdateInput): Prisma.BudgetItemUncheckedUpdateInput {
  return {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.category !== undefined ? { category: normalizeOptionalString(input.category) } : {}),
    ...(input.projectId !== undefined ? { projectId: normalizeOptionalString(input.projectId) } : {}),
    ...(input.contractId !== undefined ? { contractId: normalizeOptionalString(input.contractId) } : {}),
    ...(input.vendorId !== undefined ? { vendorId: normalizeOptionalString(input.vendorId) } : {}),
    ...(input.fiscalYear !== undefined ? { fiscalYear: normalizeOptionalNumber(input.fiscalYear) } : {}),
    ...(input.plannedAmount !== undefined ? { plannedAmount: normalizeOptionalNumber(input.plannedAmount) } : {}),
    ...(input.committedAmount !== undefined ? { committedAmount: normalizeOptionalNumber(input.committedAmount) } : {}),
    ...(input.estimatedActualAmount !== undefined ? { estimatedActualAmount: normalizeOptionalNumber(input.estimatedActualAmount) } : {}),
    ...(input.notes !== undefined ? { notes: normalizeOptionalString(input.notes) } : {})
  };
}

export async function listBudgetItems(filters?: BudgetItemFilters) {
  const validatedFilters = budgetItemFilterSchema.parse(filters ?? {});
  const andClauses = [
    ...(validatedFilters.search
      ? [
          {
            OR: [
              { title: { contains: validatedFilters.search } },
              { category: { contains: validatedFilters.search } },
              { notes: { contains: validatedFilters.search } }
            ]
          }
        ]
      : []),
    ...(validatedFilters.category ? [{ category: { contains: validatedFilters.category } }] : []),
    ...(validatedFilters.fiscalYear ? [{ fiscalYear: validatedFilters.fiscalYear }] : [])
  ];
  const where = andClauses.length > 0 ? { AND: andClauses } : {};

  return prisma.budgetItem.findMany({
    where,
    include: {
      project: true,
      contract: true,
      vendor: true
    },
    orderBy: [{ fiscalYear: "desc" }, { createdAt: "desc" }]
  });
}

export async function createBudgetItem(payload: BudgetItemInput) {
  const validated = budgetItemSchema.parse(payload);
  return prisma.budgetItem.create({
    data: buildBudgetItemCreateData(validated)
  });
}

export async function getBudgetItemById(id: string) {
  return prisma.budgetItem.findUnique({
    where: { id },
    include: {
      project: true,
      contract: true,
      vendor: true
    }
  });
}

export async function updateBudgetItem(id: string, payload: BudgetItemUpdateInput) {
  const validated = budgetItemUpdateSchema.parse(payload);
  return prisma.budgetItem.update({
    where: { id },
    data: buildBudgetItemUpdateData(validated)
  });
}

export async function deleteBudgetItem(id: string) {
  return prisma.budgetItem.delete({
    where: { id }
  });
}
