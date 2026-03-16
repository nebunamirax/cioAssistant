import type { AIIntakeResult } from "@/lib/services/ai-intake-service";

type AssistantOperationStatus = "created" | "review";

export type AssistantOperation = {
  id: string;
  module: string;
  title: string;
  status: AssistantOperationStatus;
  href: string | null;
  description: string;
};

export type AssistantCreatedRecord = {
  id: string;
  module: string;
  title: string;
  href: string;
};

export type AssistantReviewRecord = {
  id: string;
  reason: string;
  selectedModule: string;
  href: string;
};

export type AssistantMessageResponse = {
  userMessage: {
    id: string;
    role: "user";
    text: string;
    sourceName: string | null;
  };
  assistantMessage: {
    id: string;
    role: "assistant";
    status: AssistantOperationStatus;
    statusLabel: string;
    summary: string;
    content: string;
    provider: {
      provider: string;
      label: string;
      mode: string;
      model: string;
      location: "local" | "cloud";
    };
  };
  operations: AssistantOperation[];
  created: AssistantCreatedRecord[];
  reviews: AssistantReviewRecord[];
};

function buildAssistantContent(result: AIIntakeResult) {
  if (result.disposition === "created") {
    const count = result.created.length;
    const suffix = count > 1 ? "entrees ont ete creees" : "entree a ete creee";
    return `${result.summary} ${count} ${suffix} dans les modules detectes.`;
  }

  return `${result.summary} La demande a ete preparee pour revue manuelle afin d'eviter une creation incertaine.`;
}

function buildAssistantStatusLabel(result: AIIntakeResult) {
  if (result.disposition === "created") {
    return result.created.length > 1 ? "Creees" : "Creee";
  }

  return "En revue";
}

export function buildAssistantMessageResponse(args: {
  text: string;
  sourceName: string | null;
  result: AIIntakeResult;
}): AssistantMessageResponse {
  const { result, sourceName, text } = args;
  const userMessageId = crypto.randomUUID();
  const assistantMessageId = crypto.randomUUID();

  if (result.disposition === "created") {
    return {
      userMessage: {
        id: userMessageId,
        role: "user",
        text,
        sourceName
      },
      assistantMessage: {
        id: assistantMessageId,
        role: "assistant",
        status: "created",
        statusLabel: buildAssistantStatusLabel(result),
        summary: result.summary,
        content: buildAssistantContent(result),
        provider: result.provider
      },
      operations: result.created.map((item) => ({
        id: item.id,
        module: item.module,
        title: item.title,
        status: "created",
        href: item.href,
        description: `Creation finalisee dans le module ${item.module}.`
      })),
      created: result.created,
      reviews: []
    };
  }

  return {
    userMessage: {
      id: userMessageId,
      role: "user",
      text,
      sourceName
    },
    assistantMessage: {
      id: assistantMessageId,
      role: "assistant",
      status: "review",
      statusLabel: buildAssistantStatusLabel(result),
      summary: result.summary,
      content: buildAssistantContent(result),
      provider: result.provider
    },
    operations: [
      {
        id: result.reviewId,
        module: result.selectedModule,
        title: `Revue ${result.selectedModule}`,
        status: "review",
        href: `/ai-reviews?selectedId=${result.reviewId}`,
        description: result.reviewReason
      }
    ],
    created: [],
    reviews: [
      {
        id: result.reviewId,
        reason: result.reviewReason,
        selectedModule: result.selectedModule,
        href: `/ai-reviews?selectedId=${result.reviewId}`
      }
    ]
  };
}
