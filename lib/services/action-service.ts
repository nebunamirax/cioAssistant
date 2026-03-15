import { prisma } from "@/lib/db/prisma";
import { actionSchema, type ActionInput } from "@/lib/validation/action";

function toNullableDate(value?: string | null) {
  return value ? new Date(value) : null;
}

export async function listActions() {
  return prisma.action.findMany({
    include: { project: true, contract: true, vendor: true },
    orderBy: { createdAt: "desc" }
  });
}

export async function createAction(payload: ActionInput) {
  const validated = actionSchema.parse(payload);
  return prisma.action.create({
    data: {
      ...validated,
      dueDate: toNullableDate(validated.dueDate),
      description: validated.description ?? null
    }
  });
}
