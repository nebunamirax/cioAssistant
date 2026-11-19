import { Prisma } from "@prisma/client";
import { z } from "zod";
import { digest, memberSelect, publicUrl } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { cockpitFields, getFields, keyField, meetingBatch, reviewFields, roadmapFields, searchFields, versionField } from "@/lib/business/contracts";
import { getBusiness, readBusinessRoadmap, saveMeetingBatch, searchBusiness, writeBusiness } from "@/lib/business/service";
import { weeklyReview } from "@/lib/services/weekly-review-service";
import { listExternalAttention } from "@/lib/services/external-tracking-service";
import { readCockpit } from "@/lib/services/cockpit-service";
import { BusinessError } from "@/lib/business/error";
import { canonical } from "@/lib/business/canonical";
import { listWorkspacePages, readWorkspaceView } from "@/lib/services/workspace-service";
import { workspaceListFields, workspaceViewReadFields } from "@/lib/validation/workspace";
import { writeTransaction } from "@/lib/db/write-transaction";

export function businessTokenHash(request: Request) {
  const token = /^Bearer (cio_[A-Za-z0-9_-]{43})$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) throw new BusinessError("Jeton CIO Assistant requis.", 401);
  return digest(token);
}

export async function authenticateToken(db: Prisma.TransactionClient, hash: string) {
  const token = await db.claudeToken.findUnique({ where: { hash }, include: { user: { select: memberSelect } } });
  if (!token || token.revokedAt || !token.user.enabled || token.user.role !== "DSI") {
    throw new BusinessError("Jeton CIO Assistant invalide ou révoqué.", 401);
  }
  if (token.expiresAt && token.expiresAt <= new Date()) throw new BusinessError("Jeton CIO Assistant expiré. Créez un nouveau jeton dans CIO Assistant.", 401);
  return token;
}

const envelope = z.object({ operation: z.enum(["search", "get", "roadmap", "cockpit", "create", "update", "meeting_batch", "weekly_review", "external_summary", "workspace_list", "workspace_view"]), input: z.record(z.string(), z.unknown()) }).strict();
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function readBusinessBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError("JSON requis.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 512000) {
        await reader.cancel().catch(() => undefined);
        throw new BusinessError("Requête trop volumineuse.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function businessResponse(hash: string, body: unknown) {
  try {
    const access = await authenticateToken(prisma, hash);
    const { operation, input } = envelope.parse(body);
    if (operation === "workspace_list") return json({ data: await listWorkspacePages(workspaceListFields.parse(input)) });
    if (operation === "workspace_view") return json({ data: await readWorkspaceView(workspaceViewReadFields.parse(input)) });
    if (operation === "search") return json({ data: await searchBusiness(searchFields.parse(input)) });
    if (operation === "get") return json({ data: await getBusiness(getFields.parse(input)) });
    if (operation === "roadmap") return json({ data: await readBusinessRoadmap(roadmapFields.parse(input)) });
    if (operation === "cockpit") {
      const { urgency, limit } = cockpitFields.parse(input);
      const { generatedAt, counts, items, projects, milestones } = await readCockpit();
      const selection = items.filter((item) => !urgency || item.urgency === urgency);
      const origin = publicUrl();
      return json({ data: { generatedAt, counts, matchingItems: selection.length,
        items: selection.slice(0, limit).map((item) => ({ ...item, url: new URL(item.href, origin).href })),
        projects: projects.slice(0, limit).map((project) => ({ ...project, url: new URL(`/projects/${encodeURIComponent(project.id)}`, origin).href })),
        milestones: milestones.map((milestone) => ({ ...milestone, url: new URL(`/projects/${encodeURIComponent(milestone.project.id)}#${milestone.id}`, origin).href }))
      } });
    }
    if (operation === "external_summary") {
      const data = await listExternalAttention(new Date(), z.number().int().min(1).max(100).default(20).parse(input.limit));
      return json({ data });
    }
    if (operation === "weekly_review") {
      const { category, owner } = reviewFields.parse(input);
      return json({ data: (await weeklyReview()).filter((item) => (!category || item.category === category) && (!owner || item.owner === owner)) });
    }
    if (access.scope !== "PILOTAGE") throw new BusinessError("Ce jeton CIO Assistant est limité à la lecture.", 403);
    return json({ data: await commitBusinessWrite({ hash }, operation, input) });
  } catch (error) {
    return businessErrorResponse(error);
  }
}

export async function commitBusinessWrite(auth: { hash: string } | { userId: string }, operation: "create" | "update" | "meeting_batch", input: Record<string, unknown>) {
  const key = keyField.parse(input.key);
  const fingerprint = digest(canonical({ operation, input }));
  return writeTransaction(async (db) => {
    const token = "hash" in auth ? await authenticateToken(db, auth.hash) : null;
    if (token && token.scope !== "PILOTAGE") throw new BusinessError("Ce jeton CIO Assistant est limité à la lecture.", 403);
    const actor = token?.user ?? await db.user.findUnique({ where: { id: "userId" in auth ? auth.userId : "" }, select: memberSelect });
    if (!actor?.enabled || actor.role !== "DSI") throw new BusinessError("Accès DSI requis.", 403);
    const where = { userId_key: { userId: actor.id, key } };
    const existing = await db.claudeWrite.findUnique({ where });
    if (existing) {
      if (existing.fingerprint !== fingerprint) throw new BusinessError("Cette clé est déjà utilisée pour une autre écriture.", 409);
      return JSON.parse(existing.response);
    }
    const target = operation === "update" ? getFields.parse({ entity: input.entity, id: input.id }) : undefined;
    if (target && (target.entity === "page" || input.expectedVersion !== undefined)) {
      const expected = versionField.parse(input.expectedVersion);
      const current = await getBusiness(target, db);
      if (current.version !== expected) {
        throw new BusinessError("La fiche a changé depuis sa lecture. Consultez la version actuelle avant de réessayer.", 409);
      }
    }
    const saved = operation === "meeting_batch"
      ? await saveMeetingBatch(db, actor, meetingBatch.parse(input))
      : [await writeBusiness(db, actor, input.entity, input.fields, target?.id)];
    const response = {
      saved, actor: { id: actor.id, name: actor.name }, origin: token ? "MCP" : "Web",
      connector: token ? { id: token.id, label: token.label } : undefined, writtenAt: new Date().toISOString()
    };
    await db.claudeWrite.create({ data: { userId: actor.id, key, fingerprint, response: JSON.stringify(response) } });
    return response;
  });
}

export function businessErrorResponse(error: unknown) {
  if (error instanceof BusinessError) return json({ error: error.message, candidates: error.candidates }, error.status);
  if (error instanceof z.ZodError) return json({ error: "Données invalides.", issues: error.issues }, 422);
  if (error instanceof SyntaxError) return json({ error: "JSON invalide." }, 400);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") return json({ error: "Fiche introuvable ou référence invalide." }, 404);
    if (error.code === "P2002" || error.code === "P2003") return json({ error: "Conflit ou identifiant référencé invalide." }, 409);
  }
  if (error instanceof Error && ["Le rapport est archivé.", "Choisissez le mois courant ou précédent.", "L’échéance doit suivre la date du contrôle.", "Le service d’un contrôle enregistré est fixe."].includes(error.message)) {
    return json({ error: error.message }, 422);
  }
  return json({ error: "Écriture ou lecture temporairement indisponible." }, 503);
}
