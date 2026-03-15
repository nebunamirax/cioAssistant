import { type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  projectFilterSchema,
  projectSchema,
  projectUpdateSchema,
  type ProjectFilters,
  type ProjectInput,
  type ProjectUpdateInput
} from "@/lib/validation/project";

function toNullableDate(value?: string | null) {
  return value ? new Date(value) : null;
}

function normalizeOptionalString(value?: string | null) {
  if (value === undefined) return undefined;
  return value === "" ? null : value;
}

function buildProjectCreateData(input: ProjectInput): Prisma.ProjectUncheckedCreateInput {
  return {
    title: input.title,
    description: normalizeOptionalString(input.description ?? null),
    type: input.type,
    status: input.status,
    priority: input.priority,
    ownerId: normalizeOptionalString(input.ownerId),
    startDate: toNullableDate(input.startDate),
    targetDate: toNullableDate(input.targetDate)
  };
}

function buildProjectUpdateData(input: ProjectUpdateInput): Prisma.ProjectUncheckedUpdateInput {
  return {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined ? { description: normalizeOptionalString(input.description) } : {}),
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.priority !== undefined ? { priority: input.priority } : {}),
    ...(input.ownerId !== undefined ? { ownerId: normalizeOptionalString(input.ownerId) } : {}),
    ...(input.startDate !== undefined ? { startDate: toNullableDate(input.startDate) } : {}),
    ...(input.targetDate !== undefined ? { targetDate: toNullableDate(input.targetDate) } : {})
  };
}

export async function listProjects(filters?: ProjectFilters) {
  const validatedFilters = projectFilterSchema.parse(filters ?? {});
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
    ...(validatedFilters.type ? [{ type: validatedFilters.type }] : []),
    ...(validatedFilters.status ? [{ status: validatedFilters.status }] : []),
    ...(validatedFilters.priority ? [{ priority: validatedFilters.priority }] : [])
  ];
  const where = andClauses.length > 0 ? { AND: andClauses } : {};

  return prisma.project.findMany({
    where,
    include: {
      _count: {
        select: {
          actions: true,
          contracts: true,
          budgetItems: true,
          communications: true,
          meetingNotes: true
        }
      }
    },
    orderBy: [{ targetDate: "asc" }, { createdAt: "desc" }]
  });
}

export async function createProject(payload: ProjectInput) {
  const validated = projectSchema.parse(payload);
  return prisma.project.create({
    data: buildProjectCreateData(validated)
  });
}

export async function getProjectById(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      actions: {
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        take: 10
      },
      contracts: {
        orderBy: { createdAt: "desc" },
        take: 10
      },
      budgetItems: {
        orderBy: { createdAt: "desc" },
        take: 10
      },
      communications: {
        orderBy: { createdAt: "desc" },
        take: 10
      },
      meetingNotes: {
        orderBy: { meetingDate: "desc" },
        take: 10
      },
      _count: {
        select: {
          actions: true,
          contracts: true,
          budgetItems: true,
          communications: true,
          meetingNotes: true
        }
      }
    }
  });
}

export async function updateProject(id: string, payload: ProjectUpdateInput) {
  const validated = projectUpdateSchema.parse(payload);
  return prisma.project.update({
    where: { id },
    data: buildProjectUpdateData(validated)
  });
}

export async function deleteProject(id: string) {
  return prisma.project.delete({
    where: { id }
  });
}
