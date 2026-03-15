import { type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  actionFilterSchema,
  actionSchema,
  actionUpdateSchema,
  type ActionFilters,
  type ActionInput,
  type ActionUpdateInput
} from "@/lib/validation/action";

function toNullableDate(value?: string | null) {
  return value ? new Date(value) : null;
}

function normalizeOptionalString(value?: string | null) {
  if (value === undefined) return undefined;
  return value === "" ? null : value;
}

function buildActionCreateData(input: ActionInput): Prisma.ActionUncheckedCreateInput {
  return {
    title: input.title,
    description: normalizeOptionalString(input.description ?? null),
    status: input.status,
    priority: input.priority,
    dueDate: toNullableDate(input.dueDate),
    projectId: normalizeOptionalString(input.projectId),
    contractId: normalizeOptionalString(input.contractId),
    vendorId: normalizeOptionalString(input.vendorId),
    sourceType: normalizeOptionalString(input.sourceType),
    sourceRef: normalizeOptionalString(input.sourceRef),
    completedAt: input.status === "DONE" ? new Date() : null
  };
}

function buildActionUpdateData(input: ActionUpdateInput): Prisma.ActionUncheckedUpdateInput {
  return {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined ? { description: normalizeOptionalString(input.description) } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.priority !== undefined ? { priority: input.priority } : {}),
    ...(input.dueDate !== undefined ? { dueDate: toNullableDate(input.dueDate) } : {}),
    ...(input.projectId !== undefined ? { projectId: normalizeOptionalString(input.projectId) } : {}),
    ...(input.contractId !== undefined ? { contractId: normalizeOptionalString(input.contractId) } : {}),
    ...(input.vendorId !== undefined ? { vendorId: normalizeOptionalString(input.vendorId) } : {}),
    ...(input.sourceType !== undefined ? { sourceType: normalizeOptionalString(input.sourceType) } : {}),
    ...(input.sourceRef !== undefined ? { sourceRef: normalizeOptionalString(input.sourceRef) } : {}),
    ...(input.status !== undefined
      ? { completedAt: input.status === "DONE" ? new Date() : null }
      : {})
  };
}

export async function listActions(filters?: ActionFilters) {
  const validatedFilters = actionFilterSchema.parse(filters ?? {});
  const andClauses = [
    ...(validatedFilters.search
      ? [
          {
            OR: [
              { title: { contains: validatedFilters.search } },
              { description: { contains: validatedFilters.search } }
            ]
          }
        ]
      : []),
    ...(validatedFilters.status ? [{ status: validatedFilters.status }] : []),
    ...(validatedFilters.priority ? [{ priority: validatedFilters.priority }] : []),
    ...(validatedFilters.overdueOnly
      ? [
          {
            dueDate: { lt: new Date() }
          },
          {
            status: { not: "DONE" as const }
          }
        ]
      : [])
  ];
  const where = andClauses.length > 0 ? { AND: andClauses } : {};

  return prisma.action.findMany({
    where,
    include: { project: true, contract: true, vendor: true },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }]
  });
}

export async function createAction(payload: ActionInput) {
  const validated = actionSchema.parse(payload);
  return prisma.action.create({
    data: buildActionCreateData(validated)
  });
}

export async function getActionById(id: string) {
  return prisma.action.findUnique({
    where: { id },
    include: { project: true, contract: true, vendor: true }
  });
}

export async function updateAction(id: string, payload: ActionUpdateInput) {
  const validated = actionUpdateSchema.parse(payload);
  return prisma.action.update({
    where: { id },
    data: buildActionUpdateData(validated)
  });
}

export async function deleteAction(id: string) {
  return prisma.action.delete({
    where: { id }
  });
}
