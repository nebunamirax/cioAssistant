import { prisma } from "@/lib/db/prisma";
import { fetchLatestOutlookMessages, markOutlookSyncTimestamp } from "@/lib/integrations/outlook";
import { emailFilterSchema, emailUpdateSchema, type EmailFilters, type EmailUpdateInput } from "@/lib/validation/email";

function normalizeOptionalString(value?: string | null) {
  if (value === undefined) return undefined;
  return value === "" ? null : value;
}

function parseMetadata(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as {
      internetMessageId?: string | null;
      isRead?: boolean;
      hasAttachments?: boolean;
      webLink?: string | null;
      fromName?: string | null;
    };
  } catch {
    return null;
  }
}

function parseJsonArray(value?: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseAutomationResult(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function mapEmailRecord<
  T extends {
    categoriesJson?: string | null;
    automationResultJson?: string | null;
    rawMetadataJson?: string | null;
  }
>(record: T) {
  return {
    ...record,
    metadata: parseMetadata(record.rawMetadataJson),
    categories: parseJsonArray(record.categoriesJson),
    automationResult: parseAutomationResult(record.automationResultJson)
  };
}

export async function listEmails(filters?: EmailFilters) {
  const validated = emailFilterSchema.parse(filters ?? {});
  const andClauses = [
    ...(validated.search
      ? [
          {
            OR: [
              { subject: { contains: validated.search } },
              { fromEmail: { contains: validated.search } },
              { snippet: { contains: validated.search } }
            ]
          }
        ]
      : []),
    ...(validated.linkedProjectId ? [{ linkedProjectId: validated.linkedProjectId }] : []),
    ...(validated.linkedActionId ? [{ linkedActionId: validated.linkedActionId }] : [])
  ];
  const where = andClauses.length > 0 ? { AND: andClauses } : {};

  const records = await prisma.email.findMany({
    where,
    include: {
      linkedProject: true,
      linkedAction: true
    },
    orderBy: [{ receivedAt: "desc" }, { updatedAt: "desc" }]
  });

  return records.map(mapEmailRecord);
}

export async function getEmailById(id: string) {
  const record = await prisma.email.findUnique({
    where: { id },
    include: {
      linkedProject: true,
      linkedAction: true
    }
  });

  return record ? mapEmailRecord(record) : null;
}

export async function updateEmail(id: string, payload: EmailUpdateInput) {
  const validated = emailUpdateSchema.parse(payload);
  const record = await prisma.email.update({
    where: { id },
    data: {
      ...(validated.linkedProjectId !== undefined ? { linkedProjectId: normalizeOptionalString(validated.linkedProjectId) } : {}),
      ...(validated.linkedActionId !== undefined ? { linkedActionId: normalizeOptionalString(validated.linkedActionId) } : {})
    },
    include: {
      linkedProject: true,
      linkedAction: true
    }
  });

  return mapEmailRecord(record);
}

export async function syncInboxEmails(limit = 50) {
  const messages = await fetchLatestOutlookMessages(limit);

  for (const message of messages) {
    await prisma.email.upsert({
      where: {
        externalMessageId: message.id
      },
      update: {
        subject: message.subject?.trim() || "(Sans objet)",
        fromEmail: message.from?.emailAddress?.address?.trim() || "inconnu@outlook.local",
        receivedAt: new Date(message.receivedDateTime),
        snippet: normalizeOptionalString(message.bodyPreview?.trim() ?? null),
        categoriesJson: JSON.stringify((message.categories ?? []).map((category) => category.trim()).filter(Boolean)),
        rawMetadataJson: JSON.stringify({
          internetMessageId: message.internetMessageId ?? null,
          isRead: message.isRead ?? false,
          hasAttachments: message.hasAttachments ?? false,
          webLink: message.webLink ?? null,
          fromName: message.from?.emailAddress?.name?.trim() ?? null
        })
      },
      create: {
        externalMessageId: message.id,
        subject: message.subject?.trim() || "(Sans objet)",
        fromEmail: message.from?.emailAddress?.address?.trim() || "inconnu@outlook.local",
        receivedAt: new Date(message.receivedDateTime),
        snippet: normalizeOptionalString(message.bodyPreview?.trim() ?? null),
        categoriesJson: JSON.stringify((message.categories ?? []).map((category) => category.trim()).filter(Boolean)),
        rawMetadataJson: JSON.stringify({
          internetMessageId: message.internetMessageId ?? null,
          isRead: message.isRead ?? false,
          hasAttachments: message.hasAttachments ?? false,
          webLink: message.webLink ?? null,
          fromName: message.from?.emailAddress?.name?.trim() ?? null
        })
      }
    });
  }

  await markOutlookSyncTimestamp();

  return {
    syncedCount: messages.length
  };
}
