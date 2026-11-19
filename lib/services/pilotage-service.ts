import { prisma } from "@/lib/db/prisma";

export { actionLabels, projectLabels } from "@/lib/domain/display-labels";

export function pilotageDate(date?: Date | null) {
  return date ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "Europe/Paris" }).format(date) : "—";
}

export async function getPortfolio(status?: string) {
  const projects = await prisma.project.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ targetDate: { sort: "asc", nulls: "last" } }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      status: true,
      targetDate: true,
      owner: { select: { name: true } },
      objective: { select: { id: true, title: true } },
      actions: { select: { status: true } }
    }
  });

  return projects.map(({ actions, ...project }) => {
    const completed = actions.filter((action) => action.status === "DONE").length;
    return { ...project, completed, total: actions.length, blocked: actions.some((action) => action.status === "BLOCKED") };
  });
}

export async function getTeamWork() {
  const [members, actions] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        enabled: true,
        objectId: true,
        projects: {
          select: { id: true, title: true, status: true, targetDate: true },
          orderBy: [{ targetDate: { sort: "asc", nulls: "last" } }, { title: "asc" }]
        }
      },
      orderBy: { name: "asc" }
    }),
    prisma.action.findMany({
      where: { status: { not: "DONE" } },
      select: {
        id: true,
        title: true,
        ownerId: true,
        ownerName: true,
        status: true,
        dueDate: true,
        project: { select: { title: true } }
      },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { title: "asc" }]
    })
  ]);
  const groups = new Map<string, { name: string; member: typeof members[number] | null; actions: typeof actions }>();
  for (const member of members) groups.set(member.id, { name: member.name, member, actions: [] });
  for (const action of actions) {
    const name = action.ownerName?.trim() ?? "";
    const key = action.ownerId ?? `historical:${name.toLocaleLowerCase("fr")}`;
    const group = groups.get(key) ?? { name: name || "Sans responsable", member: null, actions: [] };
    group.actions.push(action);
    groups.set(key, group);
  }

  const now = new Date();
  return Array.from(groups, ([key, group]) => ({
    key,
    ...group,
    blocked: group.actions.filter((action) => action.status === "BLOCKED").length,
    overdue: group.actions.filter((action) => action.dueDate && action.dueDate < now).length
  })).sort((a, b) => b.actions.length - a.actions.length || a.name.localeCompare(b.name, "fr"));
}
