import { PrismaClient, ActionStatus, Priority, ProjectStatus, ProjectType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.upsert({
    where: { id: "seed-project-1" },
    update: {},
    create: {
      id: "seed-project-1",
      title: "MVP Assistant DSI",
      type: ProjectType.DEPLOYMENT,
      status: ProjectStatus.ACTIVE,
      priority: Priority.HIGH
    }
  });

  await prisma.action.create({
    data: {
      title: "Initialiser le backlog MVP",
      status: ActionStatus.TODO,
      priority: Priority.HIGH,
      projectId: project.id
    }
  });
}

main().finally(async () => prisma.$disconnect());
