"use server";

import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/session";
import { saveMilestone } from "@/lib/services/portfolio-write-service";

export async function storeMilestone(form: FormData) {
  await requireMember("DSI");
  const dueDate = form.get("dueDate");
  const result = await saveMilestone({
    title: form.get("title"), projectId: form.get("projectId"), status: form.get("status"),
    dueDate: dueDate ? new Date(String(dueDate) + "T12:00:00Z").toISOString() : null
  }, String(form.get("id") || "") || undefined);
  redirect(`/projects/${result.projectId}#${result.id}`);
}
