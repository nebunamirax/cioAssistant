import { Prisma } from "@prisma/client";
import { z } from "zod";
import { digest } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getFields, keyField, meetingBatch, reviewFields, searchFields } from "@/lib/business/contracts";
import { BusinessError, getBusiness, saveMeetingBatch, searchBusiness, writeBusiness } from "@/lib/business/service";
import { weeklyReview } from "@/lib/services/weekly-review-service";
import { listExternalAttention } from "@/lib/services/external-tracking-service";

const member = { id: true, name: true, role: true, enabled: true } as const;

async function tokenOwner(db: Prisma.TransactionClient, hash: string) {
  const token = await db.claudeToken.findUnique({ where: { hash }, include: { user: { select: member } } });
  if (!token || token.revokedAt || !token.user.enabled || token.user.role !== "DSI") {
    throw new BusinessError("Jeton Claude invalide ou révoqué.", 401);
  }
  return token.user;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => JSON.stringify(key) + ":" + canonical(item)).join(",") + "}";
  }
  return JSON.stringify(value);
}

const envelope = z.object({ operation: z.enum(["search", "get", "create", "update", "meeting_batch", "weekly_review", "external_summary"]), input: z.record(z.unknown()) }).strict();
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  try {
    const token = /^Bearer (cio_[A-Za-z0-9_-]{43})$/.exec(request.headers.get("authorization") ?? "")?.[1];
    if (!token) throw new BusinessError("Jeton Claude requis.", 401);
    const hash = digest(token);
    await tokenOwner(prisma, hash);
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 512000) throw new BusinessError("Requête trop volumineuse.", 413);
    const { operation, input } = envelope.parse(JSON.parse(raw));
    if (operation === "search") return json({ data: await searchBusiness(searchFields.parse(input)) });
    if (operation === "get") return json({ data: await getBusiness(getFields.parse(input)) });
    if (operation === "external_summary") {
      const data = await listExternalAttention(new Date(), z.number().int().min(1).max(100).default(20).parse(input.limit));
      return json({ data });
    }
    if (operation === "weekly_review") {
      const { category, owner } = reviewFields.parse(input);
      return json({ data: (await weeklyReview()).filter((item) => (!category || item.category === category) && (!owner || item.owner === owner)) });
    }
    const key = keyField.parse(input.key);
    const fingerprint = digest(canonical({ operation, input }));
    const data = await prisma.$transaction(async (db) => {
      await db.$executeRaw`UPDATE "ClaudeWrite" SET "key" = "key" WHERE 0`;
      const actor = await tokenOwner(db, hash);
      const where = { userId_key: { userId: actor.id, key } };
      const existing = await db.claudeWrite.findUnique({ where });
      if (existing) {
        if (existing.fingerprint !== fingerprint) throw new BusinessError("Cette clé est déjà utilisée pour une autre écriture.", 409);
        return JSON.parse(existing.response);
      }
      const saved = operation === "meeting_batch"
        ? await saveMeetingBatch(db, actor, meetingBatch.parse(input))
        : [await writeBusiness(db, actor, input.entity, input.fields,
          operation === "update" ? z.string().min(1).max(250).parse(input.id) : undefined)];
      const response = { saved, actor: { id: actor.id, name: actor.name }, origin: "Claude", writtenAt: new Date().toISOString() };
      await db.claudeWrite.create({ data: { userId: actor.id, key, fingerprint, response: JSON.stringify(response) } });
      return response;
    }, { timeout: 15000 });
    return json({ data });
  } catch (error) {
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
}
