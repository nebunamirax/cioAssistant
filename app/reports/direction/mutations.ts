"use server";

import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/session";
import { archiveMonthly, saveMonthlyDraft } from "@/lib/services/monthly-report-service";
import { prisma } from "@/lib/db/prisma";

export async function generateMonthly(form: FormData) {
  await requireMember("DSI");
  const month = String(form.get("month") ?? "");
  await prisma.$transaction((db) => saveMonthlyDraft({ month, comment: form.get("comment") ?? undefined }, db));
  redirect(`/reports/direction?month=${month}`);
}

export async function freezeMonthly(form: FormData) {
  await requireMember("DSI");
  const month = String(form.get("month") ?? "");
  await archiveMonthly(month, String(form.get("fingerprint") ?? ""));
  redirect(`/reports/direction?month=${month}`);
}
