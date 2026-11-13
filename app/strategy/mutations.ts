"use server";

import { requireMember } from "@/lib/auth/session";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { saveObjective as persistObjective } from "@/lib/services/portfolio-write-service";
import { objectiveFields } from "@/lib/validation/portfolio";

export async function saveObjective(form: FormData) {
  await requireMember("DSI");
  const result = objectiveFields.safeParse({
    title: form.get("title"), description: form.get("description") || null,
    ownerName: form.get("ownerName") || null, targetDate: form.get("targetDate") || null
  });
  if (!result.success) redirect("/strategy?error=objective");
  await persistObjective(result.data, String(form.get("id") || "") || undefined);
  revalidatePath("/strategy");
  revalidatePath("/");
  redirect("/strategy");
}

export async function setProjectObjective(form: FormData) {
  await requireMember("DSI");
  const projectId = form.get("projectId");
  const objectiveId = form.get("objectiveId");
  if (typeof projectId !== "string" || !projectId || typeof objectiveId !== "string") redirect("/strategy?error=project");
  const result = await prisma.project.updateMany({ where: { id: projectId }, data: { objectiveId: objectiveId || null } });
  if (!result.count) redirect("/strategy?error=project");
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/strategy");
  redirect("/strategy");
}
