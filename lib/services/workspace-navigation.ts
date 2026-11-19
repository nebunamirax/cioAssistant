import { cache } from "react";
import { prisma } from "@/lib/db/prisma";

export const workspacePageIndex = cache(() => prisma.workspacePage.findMany({
  select: { id: true, title: true, parentId: true },
  orderBy: { id: "asc" }
}));
