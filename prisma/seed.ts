import { PrismaClient } from "@prisma/client";
import { ACTION_STATUSES, PRIORITIES, PROJECT_STATUSES, PROJECT_TYPES } from "@/lib/domain/constants";

const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.upsert({
    where: { id: "seed-project-1" },
    update: {},
    create: {
      id: "seed-project-1",
      title: "MVP Assistant DSI",
      type: PROJECT_TYPES[1],
      status: PROJECT_STATUSES[1],
      priority: PRIORITIES[2]
    }
  });

  await prisma.action.create({
    data: {
      title: "Initialiser le backlog MVP",
      status: ACTION_STATUSES[0],
      priority: PRIORITIES[2],
      projectId: project.id
    }
  });
}

main().finally(async () => prisma.$disconnect());
