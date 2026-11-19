import { prisma } from "@/lib/db/prisma";
import { getPortfolio } from "./pilotage-service";
import { weeklyReview } from "./weekly-review-service";

export async function readCockpit(now = new Date()) {
  const [projects, projectCount, items, milestones] = await Promise.all([
    getPortfolio("ACTIVE"),
    prisma.project.count(),
    weeklyReview(now),
    prisma.milestone.findMany({
      where: {
        status: { not: "DONE" },
        dueDate: { gte: now },
        project: { status: { notIn: ["CANCELLED", "COMPLETED"] } }
      },
      include: { project: { select: { id: true, title: true } } },
      orderBy: [{ dueDate: "asc" }, { title: "asc" }, { id: "asc" }],
      take: 4
    })
  ]);
  const counts = {
    total: items.length,
    urgent: items.filter((item) => item.urgency === "urgent").length,
    decisions: items.filter((item) => item.category === "Arbitrages").length,
    activeProjects: projects.length
  };
  return { generatedAt: now, counts, items, projects, projectCount, milestones };
}
