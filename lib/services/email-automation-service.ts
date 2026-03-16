import { prisma } from "@/lib/db/prisma";
import { type EmailAutomationStatus } from "@/lib/domain/constants";
import { getOutlookConnectionStatus } from "@/lib/integrations/outlook";
import { loadAppSettingsSync } from "@/lib/settings/service";
import { syncInboxEmails } from "@/lib/services/email-service";
import { ingestAIIntake } from "@/lib/services/ai-intake-service";

type EmailAutomationRecord = {
  id: string;
  subject: string;
  fromEmail: string;
  snippet: string | null;
  receivedAt: Date;
  categoriesJson: string | null;
  automationStatus: string;
};

type WorkerState = {
  started: boolean;
  running: boolean;
  timer: NodeJS.Timeout | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __cioAssistantEmailWorker: WorkerState | undefined;
}

function getWorkerState(): WorkerState {
  if (!globalThis.__cioAssistantEmailWorker) {
    globalThis.__cioAssistantEmailWorker = {
      started: false,
      running: false,
      timer: null
    };
  }

  return globalThis.__cioAssistantEmailWorker;
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

export function parseAutomationCategories(rawValue: string) {
  return Array.from(new Set(
    rawValue
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.toLocaleLowerCase())
  ));
}

export function emailMatchesAutomationCategory(emailCategories: string[], configuredCategories: string[]) {
  if (configuredCategories.length === 0) {
    return false;
  }

  const normalizedEmailCategories = emailCategories.map((category) => category.trim().toLocaleLowerCase());
  return configuredCategories.some((category) => normalizedEmailCategories.includes(category));
}

export function buildEmailAutomationText(email: Pick<EmailAutomationRecord, "subject" | "fromEmail" | "snippet" | "receivedAt" | "categoriesJson">) {
  const categories = parseJsonArray(email.categoriesJson);

  return [
    `Sujet: ${email.subject}`,
    `Expediteur: ${email.fromEmail}`,
    `Recu le: ${email.receivedAt.toISOString()}`,
    categories.length > 0 ? `Categories Outlook: ${categories.join(", ")}` : "",
    email.snippet?.trim() ? `Extrait:\n${email.snippet.trim()}` : ""
  ].filter(Boolean).join("\n");
}

async function updateAutomationState(input: {
  id: string;
  status: EmailAutomationStatus;
  summary?: string | null;
  error?: string | null;
  result?: Record<string, unknown> | null;
  automatedAt?: Date | null;
}) {
  await prisma.email.update({
    where: { id: input.id },
    data: {
      automationStatus: input.status,
      automationSummary: input.summary ?? null,
      automationError: input.error ?? null,
      automationResultJson: input.result ? JSON.stringify(input.result) : null,
      automatedAt: input.automatedAt ?? null
    }
  });
}

export async function processAutomatedEmails(limit = 20) {
  const settings = loadAppSettingsSync();
  const configuredCategories = parseAutomationCategories(settings.integrations.outlookAutomationCategory);

  if (!settings.integrations.outlookAutomationEnabled || configuredCategories.length === 0) {
    return {
      processedCount: 0,
      createdCount: 0,
      reviewCount: 0,
      ignoredCount: 0,
      failedCount: 0
    };
  }

  const emails = await prisma.email.findMany({
    where: {
      automationStatus: {
        notIn: ["CREATED", "REVIEW"]
      }
    },
    orderBy: [{ receivedAt: "desc" }, { updatedAt: "desc" }],
    take: limit,
    select: {
      id: true,
      subject: true,
      fromEmail: true,
      snippet: true,
      receivedAt: true,
      categoriesJson: true,
      automationStatus: true
    }
  });

  let createdCount = 0;
  let reviewCount = 0;
  let ignoredCount = 0;
  let failedCount = 0;

  for (const email of emails) {
    const categories = parseJsonArray(email.categoriesJson);

    if (!emailMatchesAutomationCategory(categories, configuredCategories)) {
      if (email.automationStatus !== "IGNORED") {
        await updateAutomationState({
          id: email.id,
          status: "IGNORED",
          summary: `Email ignore: aucune categorie cible trouvee parmi ${categories.join(", ") || "aucune categorie"}.`,
          automatedAt: null
        });
      }
      ignoredCount += 1;
      continue;
    }

    await updateAutomationState({
      id: email.id,
      status: "PROCESSING",
      summary: "Analyse IA en cours.",
      automatedAt: null
    });

    try {
      const result = await ingestAIIntake({
        sourceName: `email:${email.subject}`,
        text: buildEmailAutomationText(email)
      });

      if (result.disposition === "created") {
        createdCount += 1;
        await updateAutomationState({
          id: email.id,
          status: "CREATED",
          summary: result.summary,
          result: {
            disposition: result.disposition,
            modules: result.modules,
            created: result.created
          },
          automatedAt: new Date()
        });
        continue;
      }

      reviewCount += 1;
      await updateAutomationState({
        id: email.id,
        status: "REVIEW",
        summary: result.reviewReason,
        result: {
          disposition: result.disposition,
          modules: result.modules,
          reviewId: result.reviewId,
          selectedModule: result.selectedModule
        },
        automatedAt: new Date()
      });
    } catch (error) {
      failedCount += 1;
      await updateAutomationState({
        id: email.id,
        status: "FAILED",
        error: (error as Error).message,
        summary: "L'automatisation email a echoue.",
        automatedAt: new Date()
      });
    }
  }

  return {
    processedCount: createdCount + reviewCount + ignoredCount + failedCount,
    createdCount,
    reviewCount,
    ignoredCount,
    failedCount
  };
}

export async function syncAndProcessInboxEmails(limit = 50) {
  const syncResult = await syncInboxEmails(limit);
  const processingResult = await processAutomatedEmails(limit);

  return {
    ...syncResult,
    ...processingResult
  };
}

async function runEmailAutomationCycle() {
  const settings = loadAppSettingsSync();
  const outlookStatus = getOutlookConnectionStatus();

  if (!settings.integrations.outlookEnabled || !settings.integrations.outlookPollingEnabled || !outlookStatus.connected) {
    return;
  }

  const intervalMs = settings.integrations.outlookPollingIntervalMinutes * 60_000;
  const lastSyncedAt = outlookStatus.lastSyncedAt ? new Date(outlookStatus.lastSyncedAt).getTime() : 0;

  if (lastSyncedAt && Date.now() - lastSyncedAt < intervalMs) {
    return;
  }

  await syncAndProcessInboxEmails(50);
}

export function startEmailAutomationWorker() {
  const state = getWorkerState();

  if (state.started) {
    return;
  }

  state.started = true;

  const tick = async () => {
    if (state.running) {
      return;
    }

    state.running = true;
    try {
      await runEmailAutomationCycle();
    } catch {
      // L'automatisation doit rester non bloquante pour le serveur Next local.
    } finally {
      state.running = false;
    }
  };

  state.timer = setInterval(() => {
    void tick();
  }, 60_000);

  if (typeof state.timer.unref === "function") {
    state.timer.unref();
  }

  void tick();
}
