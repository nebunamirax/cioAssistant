"use server";

import { requireMember } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { lockWrites } from "@/lib/db/write-transaction";
import { followUp, saveService } from "@/lib/services/support-service";
import { redirect } from "next/navigation";

export async function storeService(form: FormData) {
  await requireMember("DSI");
  const id = String(form.get("id") ?? "") || undefined;
  const fields = ["title", "scope", "notes", "ownerId", "vendorId", "contractId", "criticality", "escalationContact", "procedure"];
  const input = Object.fromEntries(fields.map((field) => [field, form.get(field) || null]));
  const service = await saveService(input, id);
  redirect(`/services/${service.id}`);
}

export async function createFollowUp(form: FormData) {
  const actor = await requireMember();
  const serviceId = String(form.get("serviceId") ?? "") || undefined;
  const ticketId = String(form.get("ticketId") ?? "") || undefined;
  if (!serviceId && !ticketId) throw new Error("Service ou ticket requis.");
  const action = await prisma.$transaction(async (db) => {
    await lockWrites(db);
    return followUp(db, actor, serviceId, ticketId);
  });
  redirect(`/actions?selectedId=${action.id}`);
}
