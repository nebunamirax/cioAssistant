import type { AIIntakeResult } from "@/lib/services/ai-intake-service";
import { projectLabels } from "@/lib/domain/display-labels";
import { pilotageDate } from "@/lib/services/pilotage-service";
import { listProjects } from "@/lib/services/project-service";
import type { ProjectFilters } from "@/lib/validation/project";

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
    status: AssistantOperationStatus | "answered";
    statusLabel: string;
    summary: string;
    content: string;
    provider?: {
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
  links?: { href: string; title: string; detail?: string }[];
};

const projectStatusByPhrase: Record<string, ProjectFilters["status"]> = {
  actifs: "ACTIVE",
  "en cours": "ACTIVE",
  "en pause": "ON_HOLD",
  termines: "COMPLETED",
  annules: "CANCELLED",
  "a cadrer": "DRAFT"
};

function normalizeQuestion(text: string) {
  return text.normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

const projectListQuestion = /^(?:(?:quels sont (?:tous )?les |(?:lister?|afficher?|montrer?|donner?)(?:[ -]moi)? (?:la liste (?:des|de tous les) |(?:tous )?les ))?projets?|la liste des projets|quels projets sont)(?: (actifs|en cours|en pause|termines|annules|a cadrer))?$/;
const singleProjectQuestion = /^(?:(?:resumer?|decris|decrire|presenter?|afficher?|montrer?)(?:[ -]moi)? le projet|parle[ -]moi du projet|ou en est le projet|quel est le statut du projet) (.+)$/;
const projectLimit = 20;

export async function answerAssistantProjectQuestion(text: string): Promise<AssistantMessageResponse | null> {
  const question = normalizeQuestion(text)
    .replace(/[?!.]+$/, "").trim()
    .replace(/^(?:est-ce que )?(?:tu (?:peux|pourrais)|(?:peux|pourrais)[ -]tu|pouvez-vous) (?:me dire |m['’]indiquer |me )?/, "");
  const list = projectListQuestion.exec(question);
  const named = singleProjectQuestion.exec(question);
  if (!list && !named) return null;

  const status = list?.[1] ? projectStatusByPhrase[list[1]] : undefined;
  const projects = await listProjects({ status });
  const title = named?.[1].replace(/^["“«]\s*|\s*["”»]$/g, "");
  let matches = projects;
  if (title) {
    const exactMatches = projects.filter((project) => normalizeQuestion(project.title) === title);
    matches = exactMatches.length ? exactMatches : projects.filter((project) => normalizeQuestion(project.title).includes(title));
  } else if (named) {
    matches = [];
  }
  const project = title && matches.length === 1 ? matches[0] : undefined;
  const links: NonNullable<AssistantMessageResponse["links"]> = matches.slice(0, projectLimit).map((item) => ({
    href: `/projects/${encodeURIComponent(item.id)}`,
    title: item.title,
    detail: projectLabels[item.status] ?? item.status
  }));

  let content = `${matches.length} ${matches.length === 1 ? "projet trouvé" : "projets trouvés"}.`;
  if (!matches.length) content = named ? "Aucun projet ne correspond à ce titre." : "Aucun projet à afficher.";
  if (matches.length > projectLimit) {
    content += ` Voici les ${projectLimit} premiers.`;
    links.push({ href: status ? `/projects?status=${status}` : "/projects", title: "Ouvrir la liste des projets" });
  }
  if (project) {
    const date = project.targetDate ? ` Échéance cible le ${pilotageDate(project.targetDate)}.` : "";
    const count = project._count.actions;
    const description = project.description?.trim();
    const excerpt = description && description.length > 600 ? `${description.slice(0, 597)}…` : description;
    content = `${project.title} est au statut « ${projectLabels[project.status] ?? project.status} ».${date} ${count} ${count === 1 ? "action liée" : "actions liées"}.${excerpt ? `\n\n${excerpt}` : ""}`;
  }

  return {
    userMessage: { id: crypto.randomUUID(), role: "user", text, sourceName: null },
    assistantMessage: { id: crypto.randomUUID(), role: "assistant", status: "answered", statusLabel: "Consultation", summary: "", content },
    operations: [],
    created: [],
    reviews: [],
    links
  };
}

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
