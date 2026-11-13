"use server";

import { requireMember } from "@/lib/auth/session";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const memberFields = z.object({
  name: z.string().trim().min(2).max(120),
  role: z.enum(["DSI", "APPRENTI"]),
  objectId: z.string().uuid().transform((id) => id.toLowerCase()),
  email: z.string().trim().toLowerCase().email().max(254)
});

export async function addMember(form: FormData) {
  await requireMember("DSI");
  const result = memberFields.safeParse(Object.fromEntries(form));
  if (!result.success) redirect("/team?error=invalid");
  const tenantId = process.env.ENTRA_TENANT_ID?.toLowerCase();
  if (!tenantId) redirect("/team?error=entra");
  try {
    const existing = await prisma.user.findUnique({ where: { email: result.data.email } });
    if (existing?.passwordHash || (existing?.objectId && (existing.objectId !== result.data.objectId || existing.tenantId !== tenantId))) redirect("/team?error=duplicate");
    await prisma.user.upsert({
      where: { email: result.data.email },
      create: { ...result.data, tenantId, enabled: true },
      update: { ...result.data, tenantId, enabled: true }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") redirect("/team?error=duplicate");
    throw error;
  }
  revalidatePath("/team");
  revalidatePath("/projects");
  redirect("/team");
}

export async function disableMember(form: FormData) {
  const actor = await requireMember("DSI");
  const id = String(form.get("id") ?? "");
  if (!id || id === "local-dsi" || id === actor.id) return;
  await prisma.$transaction(async (db) => {
    await db.user.updateMany({ where: { id, passwordHash: null }, data: { enabled: false } });
    await db.session.deleteMany({ where: { userId: id } });
    await db.claudeToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  });
  revalidatePath("/team");
}
