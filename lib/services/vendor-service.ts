import { type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  vendorFilterSchema,
  vendorSchema,
  vendorUpdateSchema,
  type VendorFilters,
  type VendorInput,
  type VendorUpdateInput
} from "@/lib/validation/vendor";

function normalizeOptionalString(value?: string | null) {
  if (value === undefined) return undefined;
  return value === "" ? null : value;
}

function buildVendorCreateData(input: VendorInput): Prisma.VendorUncheckedCreateInput {
  return {
    name: input.name,
    category: normalizeOptionalString(input.category ?? null),
    mainContactName: normalizeOptionalString(input.mainContactName ?? null),
    mainContactEmail: normalizeOptionalString(input.mainContactEmail ?? null),
    notes: normalizeOptionalString(input.notes ?? null)
  };
}

function buildVendorUpdateData(input: VendorUpdateInput): Prisma.VendorUncheckedUpdateInput {
  return {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.category !== undefined ? { category: normalizeOptionalString(input.category) } : {}),
    ...(input.mainContactName !== undefined ? { mainContactName: normalizeOptionalString(input.mainContactName) } : {}),
    ...(input.mainContactEmail !== undefined ? { mainContactEmail: normalizeOptionalString(input.mainContactEmail) } : {}),
    ...(input.notes !== undefined ? { notes: normalizeOptionalString(input.notes) } : {})
  };
}

export async function listVendors(filters?: VendorFilters) {
  const validatedFilters = vendorFilterSchema.parse(filters ?? {});
  const andClauses = [
    ...(validatedFilters.search
      ? [
          {
            OR: [
              { name: { contains: validatedFilters.search } },
              { category: { contains: validatedFilters.search } },
              { mainContactName: { contains: validatedFilters.search } },
              { mainContactEmail: { contains: validatedFilters.search } }
            ]
          }
        ]
      : []),
    ...(validatedFilters.category ? [{ category: { contains: validatedFilters.category } }] : [])
  ];
  const where = andClauses.length > 0 ? { AND: andClauses } : {};

  return prisma.vendor.findMany({
    where,
    include: {
      _count: {
        select: {
          actions: true,
          contracts: true,
          supportServices: true,
          budgetItems: true
        }
      }
    },
    orderBy: [{ name: "asc" }, { createdAt: "desc" }]
  });
}

export async function createVendor(payload: VendorInput) {
  const validated = vendorSchema.parse(payload);
  return prisma.vendor.create({
    data: buildVendorCreateData(validated)
  });
}

export async function getVendorById(id: string) {
  return prisma.vendor.findUnique({
    where: { id },
    include: {
      contracts: {
        orderBy: [{ endDate: "asc" }, { createdAt: "desc" }],
        take: 10
      },
      actions: {
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        take: 10
      },
      supportServices: {
        orderBy: { createdAt: "desc" },
        take: 10
      },
      budgetItems: {
        orderBy: { createdAt: "desc" },
        take: 10
      },
      _count: {
        select: {
          actions: true,
          contracts: true,
          supportServices: true,
          budgetItems: true
        }
      }
    }
  });
}

export async function updateVendor(id: string, payload: VendorUpdateInput) {
  const validated = vendorUpdateSchema.parse(payload);
  return prisma.vendor.update({
    where: { id },
    data: buildVendorUpdateData(validated)
  });
}

export async function deleteVendor(id: string) {
  return prisma.vendor.delete({
    where: { id }
  });
}
