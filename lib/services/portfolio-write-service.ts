import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { milestoneFields, objectiveFields } from "@/lib/validation/portfolio";

export function saveObjective(input: unknown, id?: string, db: Prisma.TransactionClient = prisma) {
  if (id) {
    const { targetDate, ...data } = objectiveFields.partial().parse(input);
    return db.strategicObjective.update({ where: { id }, data: { ...data, targetDate: targetDate === undefined ? undefined : targetDate ? new Date(targetDate) : null } });
  }
  const { targetDate, ...data } = objectiveFields.parse(input);
  return db.strategicObjective.create({ data: { ...data, targetDate: targetDate ? new Date(targetDate) : null } });
}

export function saveMilestone(input: unknown, id?: string, db: Prisma.TransactionClient = prisma) {
  if (id) return db.milestone.update({ where: { id }, data: milestoneFields.partial().parse(input) });
  return db.milestone.create({ data: milestoneFields.parse(input) });
}
