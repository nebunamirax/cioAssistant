import { type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  contractFilterSchema,
  contractSchema,
  contractUpdateSchema,
  type ContractFilters,
  type ContractInput,
  type ContractUpdateInput
} from "@/lib/validation/contract";

function toNullableDate(value?: string | null) {
  return value ? new Date(value) : null;
}

function normalizeOptionalString(value?: string | null) {
  if (value === undefined) return undefined;
  return value === "" ? null : value;
}

function normalizeOptionalNumber(value?: number | null) {
  if (value === undefined) return undefined;
  return value === null ? null : value;
}

function buildContractCreateData(input: ContractInput): Prisma.ContractUncheckedCreateInput {
  return {
    vendorId: input.vendorId,
    projectId: normalizeOptionalString(input.projectId),
    title: input.title,
    contractType: normalizeOptionalString(input.contractType ?? null),
    status: input.status,
    startDate: toNullableDate(input.startDate),
    endDate: toNullableDate(input.endDate),
    noticePeriodDays: normalizeOptionalNumber(input.noticePeriodDays ?? null),
    amountPlanned: normalizeOptionalNumber(input.amountPlanned ?? null),
    notes: normalizeOptionalString(input.notes ?? null),
    renewalType: input.renewalType
  };
}

function buildContractUpdateData(input: ContractUpdateInput): Prisma.ContractUncheckedUpdateInput {
  return {
    ...(input.vendorId !== undefined ? { vendorId: input.vendorId } : {}),
    ...(input.projectId !== undefined ? { projectId: normalizeOptionalString(input.projectId) } : {}),
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.contractType !== undefined ? { contractType: normalizeOptionalString(input.contractType) } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.startDate !== undefined ? { startDate: toNullableDate(input.startDate) } : {}),
    ...(input.endDate !== undefined ? { endDate: toNullableDate(input.endDate) } : {}),
    ...(input.noticePeriodDays !== undefined ? { noticePeriodDays: normalizeOptionalNumber(input.noticePeriodDays) } : {}),
    ...(input.amountPlanned !== undefined ? { amountPlanned: normalizeOptionalNumber(input.amountPlanned) } : {}),
    ...(input.notes !== undefined ? { notes: normalizeOptionalString(input.notes) } : {}),
    ...(input.renewalType !== undefined ? { renewalType: input.renewalType } : {})
  };
}

export async function listContracts(filters?: ContractFilters) {
  const validatedFilters = contractFilterSchema.parse(filters ?? {});
  const now = new Date();
  const inNinetyDays = new Date(now);
  inNinetyDays.setDate(inNinetyDays.getDate() + 90);

  const andClauses = [
    ...(validatedFilters.search
      ? [
          {
            OR: [
              { title: { contains: validatedFilters.search } },
              { notes: { contains: validatedFilters.search } }
            ]
          }
        ]
      : []),
    ...(validatedFilters.status ? [{ status: validatedFilters.status }] : []),
    ...(validatedFilters.renewalType ? [{ renewalType: validatedFilters.renewalType }] : []),
    ...(validatedFilters.expiringOnly
      ? [
          { endDate: { gte: now } },
          { endDate: { lte: inNinetyDays } },
          { status: "ACTIVE" }
        ]
      : [])
  ];
  const where = andClauses.length > 0 ? { AND: andClauses } : {};

  return prisma.contract.findMany({
    where,
    include: {
      vendor: true,
      project: true,
      _count: {
        select: {
          actions: true,
          budgetItems: true,
          communications: true,
          supportServices: true
        }
      }
    },
    orderBy: [{ endDate: "asc" }, { createdAt: "desc" }]
  });
}

export async function createContract(payload: ContractInput) {
  const validated = contractSchema.parse(payload);
  return prisma.contract.create({
    data: buildContractCreateData(validated)
  });
}

export async function getContractById(id: string) {
  return prisma.contract.findUnique({
    where: { id },
    include: {
      vendor: true,
      project: true,
      actions: {
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
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
      supportServices: {
        orderBy: { createdAt: "desc" },
        take: 10
      },
      _count: {
        select: {
          actions: true,
          budgetItems: true,
          communications: true,
          supportServices: true
        }
      }
    }
  });
}

export async function updateContract(id: string, payload: ContractUpdateInput) {
  const validated = contractUpdateSchema.parse(payload);
  return prisma.contract.update({
    where: { id },
    data: buildContractUpdateData(validated)
  });
}

export async function deleteContract(id: string) {
  return prisma.contract.delete({
    where: { id }
  });
}
