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
    ownerId: input.ownerId,
    ownerName: normalizeOptionalString(input.ownerName ?? null),
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
    ...(input.ownerId !== undefined ? { ownerId: input.ownerId } : {}),
    ...(input.ownerName !== undefined ? { ownerName: normalizeOptionalString(input.ownerName) } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.priority !== undefined ? { priority: input.priority } : {}),
    ...(input.dueDate !== undefined ? { dueDate: toNullableDate(input.dueDate) } : {}),
    ...(input.projectId !== undefined ? { projectId: normalizeOptionalString(input.projectId) } : {}),
    ...(input.contractId !== undefined ? { contractId: normalizeOptionalString(input.contractId) } : {}),
    ...(input.vendorId !== undefined ? { vendorId: normalizeOptionalString(input.vendorId) } : {}),
    ...(input.sourceType !== undefined ? { sourceType: normalizeOptionalString(input.sourceType) } : {}),
    ...(input.sourceRef !== undefined ? { sourceRef: normalizeOptionalString(input.sourceRef) } : {}),
    ...(input.status !== undefined && input.status !== "DONE" ? { completedAt: null } : {})
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
              { description: { contains: validatedFilters.search } },
              { ownerName: { contains: validatedFilters.search } },
              { sourceRef: { contains: validatedFilters.search } }
            ]
          }
        ]
      : []),
    ...(validatedFilters.status ? [{ status: validatedFilters.status }] : []),
    ...(validatedFilters.priority ? [{ priority: validatedFilters.priority }] : []),
    ...(validatedFilters.unassigned ? [{ projectId: null }] : validatedFilters.projectId ? [{ projectId: validatedFilters.projectId }] : []),
    ...(validatedFilters.overdueOnly ? [{ dueDate: { lt: new Date() } }] : []),
    ...(validatedFilters.openOnly || validatedFilters.overdueOnly ? [{ status: { not: "DONE" as const } }] : [])
  ];
  const where = andClauses.length > 0 ? { AND: andClauses } : {};

  return prisma.action.findMany({
    where,
    include: { project: true, contract: true, vendor: true, owner: { select: { name: true } } },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }]
  });
}

type ActionActor = { id: string; name: string; role: string };

export async function createAction(payload: ActionInput, db: Prisma.TransactionClient = prisma, actor?: ActionActor) {
  const validated = actionSchema.parse(payload);
  if (actor && actor.role !== "DSI") {
    Object.assign(validated, { ownerId: actor.id, ownerName: actor.name, sourceType: null, sourceRef: null, vendorId: null, contractId: null });
  } else if (validated.ownerId) {
    const member = await db.user.findUniqueOrThrow({ where: { id: validated.ownerId }, select: { name: true } });
    validated.ownerName = member.name;
  }
  return db.action.create({
    data: buildActionCreateData(validated)
  });
}

export async function getActionById(id: string) {
  return prisma.action.findUnique({
    where: { id },
    include: { project: true, contract: true, vendor: true, owner: { select: { name: true } } }
  });
}

export async function updateAction(id: string, payload: ActionUpdateInput, db: Prisma.TransactionClient = prisma, actor?: ActionActor) {
  const validated = actionUpdateSchema.parse(payload);
  const ownerId = actor && actor.role !== "DSI" ? actor.id : undefined;
  if (ownerId && Object.keys(validated).some((field) => field !== "status")) throw new Error("Seul le statut peut être modifié.");
  if (validated.ownerId) {
    const member = await db.user.findUniqueOrThrow({ where: { id: validated.ownerId }, select: { name: true } });
    // Keep the historical name when an existing action is matched.
    const current = await db.action.findUniqueOrThrow({ where: { id }, select: { ownerName: true } });
    validated.ownerName = current.ownerName || member.name;
  }
  const data = buildActionUpdateData(validated);
  if (validated.status === "DONE") {
    await db.action.updateMany({ where: { id, ownerId, completedAt: null }, data: { completedAt: new Date() } });
  }
  return db.action.update({
    where: { id, ownerId },
    data
  });
}

export async function deleteAction(id: string) {
  return prisma.action.delete({
    where: { id }
  });
}
