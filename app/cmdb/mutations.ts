"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { cmdbItemSchema, cmdbRelationSchema } from "@/lib/validation/cmdb";

type FormResult = { error?: string; message?: string };

export async function saveConfigurationItem(id: string | null, _previous: FormResult, form: FormData): Promise<FormResult> {
  await requireMember("DSI");
  const item = cmdbItemSchema.safeParse(Object.fromEntries(form));
  if (!item.success) return { error: "Vérifiez les champs de la fiche." };

  let itemId: string;
  try {
    const saved = id
      ? await prisma.configurationItem.update({ where: { id }, data: item.data, select: { id: true } })
      : await prisma.configurationItem.create({ data: item.data, select: { id: true } });
    itemId = saved.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") return { error: "Cette référence est déjà utilisée." };
      if (error.code === "P2003") return { error: "Le service ou le prestataire sélectionné a été supprimé. Rechargez la fiche." };
      if (error.code === "P2025") return { error: "Cet élément a été supprimé." };
    }
    throw error;
  }

  revalidatePath("/cmdb", "layout");
  if (!id) redirect(`/cmdb/${itemId}`);
  return { message: "Fiche enregistrée." };
}

export async function addConfigurationRelation(id: string, _previous: FormResult, form: FormData): Promise<FormResult> {
  await requireMember("DSI");
  const relation = cmdbRelationSchema.safeParse({ sourceId: id, targetId: form.get("targetId"), type: form.get("type") });
  if (!relation.success) return { error: "Choisissez un autre élément et un type de relation." };

  try {
    await prisma.configurationRelation.create({ data: relation.data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") return { error: "Cette relation existe déjà." };
      if (error.code === "P2003") return { error: "Un des éléments de la relation a été supprimé." };
    }
    throw error;
  }
  revalidatePath("/cmdb", "layout");
  return { message: "Relation ajoutée." };
}

export async function removeConfigurationRelation(itemId: string, relationId: string, _previous: FormResult, _form: FormData): Promise<FormResult> {
  await requireMember("DSI");
  await prisma.configurationRelation.deleteMany({
    where: { id: relationId, OR: [{ sourceId: itemId }, { targetId: itemId }] }
  });
  revalidatePath("/cmdb", "layout");
  return { message: "Relation retirée." };
}

export async function deleteConfigurationItem(id: string, _previous: FormResult, _form: FormData): Promise<FormResult> {
  await requireMember("DSI");
  await prisma.configurationItem.deleteMany({ where: { id } });
  revalidatePath("/cmdb", "layout");
  redirect("/cmdb");
}
