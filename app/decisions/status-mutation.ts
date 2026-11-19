"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { currentMember } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { DECISION_STATUSES, RISK_STATUSES } from "@/lib/domain/constants";

const statusChange = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("risk"), id: z.string().min(1).max(250), status: z.enum(RISK_STATUSES), previous: z.enum(RISK_STATUSES) }),
  z.object({ kind: z.literal("decision"), id: z.string().min(1).max(250), status: z.enum(DECISION_STATUSES), previous: z.enum(DECISION_STATUSES) })
]);

export async function setReviewStatus(previous: string, _state: string | null, form: FormData) {
  if ((await currentMember())?.role !== "DSI") return "Accès DSI requis.";
  const change = statusChange.safeParse({ previous, kind: form.get("kind"), id: form.get("id"), status: form.get("status") });
  if (!change.success) return "Statut invalide.";
  const { id, status, kind } = change.data;
  const args = { where: { id, status: previous }, data: { status } };
  const page = kind === "risk" ? "/risks" : "/decisions";
  try {
    const result = await (kind === "risk" ? prisma.risk.updateMany(args) : prisma.decision.updateMany(args));
    if (result.count === 0) return "La fiche a changé. Actualisez la page avant de modifier son statut.";
  } catch {
    return "Le statut n’a pas pu être enregistré. Réessayez.";
  }
  revalidatePath(page);
  revalidatePath("/");
  revalidatePath("/weekly-review");
  return null;
}
