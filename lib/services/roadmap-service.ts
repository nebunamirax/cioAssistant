import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type RoadmapProject = Awaited<ReturnType<typeof getRoadmapData>>["projects"][number];

const projectSelection = {
  id: true, title: true, status: true, priority: true, startDate: true, targetDate: true,
  owner: { select: { name: true } },
  objective: { select: { id: true, title: true } },
  milestones: { select: { id: true, dueDate: true, title: true, status: true }, orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { title: "asc" }] },
  _count: { select: { actions: true } }
} satisfies Prisma.ProjectSelect;

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

export function buildRoadmapMonths(anchor = new Date(), count = 9) {
  const first = startOfMonth(anchor);
  return Array.from({ length: count }, (_, index) => addMonths(first, index));
}

export function getRoadmapProjects(options: { status?: string; limit?: number; offset?: number } = {}) {
  return prisma.project.findMany({
    where: { status: options.status ?? { not: "CANCELLED" } },
    select: projectSelection,
    orderBy: [{ targetDate: { sort: "asc", nulls: "last" } }, { title: "asc" }, { id: "asc" }],
    skip: options.offset,
    take: options.limit
  });
}

export function getRoadmapProject(projectId: string) {
  return prisma.project.findUnique({ where: { id: projectId }, select: projectSelection });
}

export async function getRoadmapData() {
  const [projects, unassignedCount] = await Promise.all([
    getRoadmapProjects(),
    prisma.action.count({ where: { projectId: null, status: { not: "DONE" } } })
  ]);
  return { projects, unassignedCount };
}

export function getRoadmapActions(projectId: string, options: { limit?: number; offset?: number } = {}) {
  return prisma.action.findMany({
    where: { projectId },
    select: { id: true, title: true, dueDate: true, status: true, ownerName: true, owner: { select: { name: true } } },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { title: "asc" }, { id: "asc" }],
    skip: options.offset,
    take: options.limit
  });
}

export function getRoadmapPosition(args: {
  startDate?: Date | null;
  targetDate?: Date | null;
  months: Date[];
}) {
  const first = args.months[0];
  const last = args.months.at(-1);
  const start = args.startDate ?? args.targetDate;
  const end = args.targetDate ?? args.startDate;
  if (!first || !last || !start || !end || start > end) return null;

  const boundary = addMonths(last, 1);
  if (end < first || start >= boundary) return null;

  function offset(date: Date) {
    if (date <= first) return 0;
    if (date >= boundary) return 100;
    const monthStart = startOfMonth(date);
    const monthIndex = (date.getUTCFullYear() - first.getUTCFullYear()) * 12 + date.getUTCMonth() - first.getUTCMonth();
    const fraction = (date.getTime() - monthStart.getTime()) / (addMonths(monthStart, 1).getTime() - monthStart.getTime());
    return (monthIndex + fraction) * 100 / args.months.length;
  }

  const left = offset(start);
  return { left, width: offset(end) - left };
}
