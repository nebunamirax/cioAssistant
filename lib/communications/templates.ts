export const COMMUNICATION_TEMPLATE_KEYS = [
  "POST_MORTEM",
  "PROJECT_PROGRESS",
  "CODIR_FOLLOW_UP"
] as const;

export type CommunicationTemplateKey = (typeof COMMUNICATION_TEMPLATE_KEYS)[number];

export type CommunicationTemplateField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "date";
  placeholder?: string;
};

export type CommunicationTemplateDefinition = {
  key: CommunicationTemplateKey;
  label: string;
  description: string;
  defaultType: string;
  fields: CommunicationTemplateField[];
};

export type CommunicationTemplateInputData = Record<string, string>;

type TemplateRenderContext = {
  projectTitle?: string | null;
  actionTitle?: string | null;
  contractTitle?: string | null;
};

export const communicationTemplates: Record<CommunicationTemplateKey, CommunicationTemplateDefinition> = {
  POST_MORTEM: {
    key: "POST_MORTEM",
    label: "Post mortem",
    description: "Formalise un incident, ses impacts, ses causes et les actions correctives.",
    defaultType: "post-mortem",
    fields: [
      { key: "incidentTitle", label: "Incident", type: "text", placeholder: "Ex: indisponibilite du SSO" },
      { key: "incidentDate", label: "Date de l'incident", type: "date" },
      { key: "summary", label: "Resume", type: "textarea", placeholder: "Contexte et chronologie synthétique" },
      { key: "impact", label: "Impact", type: "textarea", placeholder: "Utilisateurs, services, business" },
      { key: "rootCause", label: "Cause racine", type: "textarea", placeholder: "Origine technique ou organisationnelle" },
      { key: "actions", label: "Actions correctives", type: "textarea", placeholder: "Mesures deja prises ou a engager" },
      { key: "lessonsLearned", label: "Enseignements", type: "textarea", placeholder: "Ce qu'il faut changer durablement" }
    ]
  },
  PROJECT_PROGRESS: {
    key: "PROJECT_PROGRESS",
    label: "Synthese d'avancement projet",
    description: "Produit une communication d'avancement structurée pour un projet.",
    defaultType: "project-update",
    fields: [
      { key: "reportingPeriod", label: "Periode", type: "text", placeholder: "Ex: Semaine 11 / Mars 2026" },
      { key: "projectName", label: "Nom du projet", type: "text", placeholder: "Laisse vide pour reutiliser le projet lie" },
      { key: "overallStatus", label: "Statut global", type: "text", placeholder: "Ex: dans les temps / sous tension" },
      { key: "summary", label: "Resume executif", type: "textarea", placeholder: "Ce qu'il faut retenir en 3-5 lignes" },
      { key: "achievements", label: "Faits marquants", type: "textarea", placeholder: "Livrables, decisions, jalons franchis" },
      { key: "risks", label: "Risques / points de vigilance", type: "textarea", placeholder: "Blocages, alertes, dependances" },
      { key: "decisionsNeeded", label: "Decisions attendues", type: "textarea", placeholder: "Arbitrages necessaires" },
      { key: "nextMilestones", label: "Prochaines etapes", type: "textarea", placeholder: "Jalons a venir" }
    ]
  },
  CODIR_FOLLOW_UP: {
    key: "CODIR_FOLLOW_UP",
    label: "Communication suivi codir",
    description: "Synthese exploitable pour un suivi codir ou comex.",
    defaultType: "codir-follow-up",
    fields: [
      { key: "meetingDate", label: "Date du codir", type: "date" },
      { key: "scope", label: "Perimetre", type: "text", placeholder: "Ex: portefeuille projets IT / cyber / infra" },
      { key: "highlights", label: "Messages cles", type: "textarea", placeholder: "Les 3 ou 4 points principaux" },
      { key: "decisions", label: "Decisions actees", type: "textarea", placeholder: "Decisions prises ou confirmees" },
      { key: "risks", label: "Risques et alertes", type: "textarea", placeholder: "Points remontes au codir" },
      { key: "asks", label: "Demandes au codir", type: "textarea", placeholder: "Soutiens, arbitrages, validations" },
      { key: "nextSteps", label: "Suites a donner", type: "textarea", placeholder: "Actions et prochaines echeances" }
    ]
  }
};

function toParagraphs(value?: string | null) {
  if (!value?.trim()) {
    return "- A completer";
  }

  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `- ${line}`)
    .join("\n");
}

function toLine(value?: string | null, fallback = "A completer") {
  return value?.trim() || fallback;
}

function normalizeDate(value?: string | null) {
  if (!value) {
    return "A completer";
  }

  return value;
}

function resolveTemplateValue(
  inputData: CommunicationTemplateInputData,
  key: string,
  fallback?: string | null
) {
  return inputData[key]?.trim() || fallback || "";
}

export function getCommunicationTemplate(key?: string | null) {
  if (!key) {
    return null;
  }

  return key in communicationTemplates
    ? communicationTemplates[key as CommunicationTemplateKey]
    : null;
}

export function sanitizeTemplateInputData(
  inputData?: Record<string, string | null | undefined> | null
): CommunicationTemplateInputData {
  if (!inputData) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(inputData)
      .map(([key, value]) => [key, value?.toString().trim() ?? ""])
      .filter(([, value]) => value.length > 0)
  );
}

export function renderCommunicationTemplate(
  templateKey: CommunicationTemplateKey,
  inputData: CommunicationTemplateInputData,
  context: TemplateRenderContext = {}
) {
  switch (templateKey) {
    case "POST_MORTEM": {
      const incidentTitle = resolveTemplateValue(inputData, "incidentTitle", context.actionTitle);
      const incidentDate = normalizeDate(resolveTemplateValue(inputData, "incidentDate"));
      const title = `Post mortem - ${toLine(incidentTitle)}`;
      const contentMarkdown = [
        `# ${title}`,
        "",
        `Date de l'incident: ${incidentDate}`,
        "",
        "## Resume",
        "",
        toLine(resolveTemplateValue(inputData, "summary")),
        "",
        "## Impact",
        "",
        toParagraphs(resolveTemplateValue(inputData, "impact")),
        "",
        "## Cause racine",
        "",
        toParagraphs(resolveTemplateValue(inputData, "rootCause")),
        "",
        "## Actions correctives",
        "",
        toParagraphs(resolveTemplateValue(inputData, "actions")),
        "",
        "## Enseignements",
        "",
        toParagraphs(resolveTemplateValue(inputData, "lessonsLearned"))
      ].join("\n");

      return {
        title,
        type: communicationTemplates.POST_MORTEM.defaultType,
        contentMarkdown,
        contentText: contentMarkdown.replaceAll("## ", "").replaceAll("# ", "")
      };
    }
    case "PROJECT_PROGRESS": {
      const projectName = resolveTemplateValue(inputData, "projectName", context.projectTitle);
      const period = resolveTemplateValue(inputData, "reportingPeriod");
      const title = `Synthese avancement - ${toLine(projectName)}${period ? ` (${period})` : ""}`;
      const contentMarkdown = [
        `# ${title}`,
        "",
        `Statut global: ${toLine(resolveTemplateValue(inputData, "overallStatus"))}`,
        "",
        "## Resume executif",
        "",
        toLine(resolveTemplateValue(inputData, "summary")),
        "",
        "## Faits marquants",
        "",
        toParagraphs(resolveTemplateValue(inputData, "achievements")),
        "",
        "## Risques et points de vigilance",
        "",
        toParagraphs(resolveTemplateValue(inputData, "risks")),
        "",
        "## Decisions attendues",
        "",
        toParagraphs(resolveTemplateValue(inputData, "decisionsNeeded")),
        "",
        "## Prochaines etapes",
        "",
        toParagraphs(resolveTemplateValue(inputData, "nextMilestones"))
      ].join("\n");

      return {
        title,
        type: communicationTemplates.PROJECT_PROGRESS.defaultType,
        contentMarkdown,
        contentText: contentMarkdown.replaceAll("## ", "").replaceAll("# ", "")
      };
    }
    case "CODIR_FOLLOW_UP": {
      const meetingDate = normalizeDate(resolveTemplateValue(inputData, "meetingDate"));
      const scope = resolveTemplateValue(inputData, "scope", context.projectTitle);
      const title = `Suivi codir - ${meetingDate}`;
      const contentMarkdown = [
        `# ${title}`,
        "",
        `Perimetre: ${toLine(scope)}`,
        "",
        "## Messages cles",
        "",
        toParagraphs(resolveTemplateValue(inputData, "highlights")),
        "",
        "## Decisions actees",
        "",
        toParagraphs(resolveTemplateValue(inputData, "decisions")),
        "",
        "## Risques et alertes",
        "",
        toParagraphs(resolveTemplateValue(inputData, "risks")),
        "",
        "## Demandes au codir",
        "",
        toParagraphs(resolveTemplateValue(inputData, "asks")),
        "",
        "## Suites a donner",
        "",
        toParagraphs(resolveTemplateValue(inputData, "nextSteps"))
      ].join("\n");

      return {
        title,
        type: communicationTemplates.CODIR_FOLLOW_UP.defaultType,
        contentMarkdown,
        contentText: contentMarkdown.replaceAll("## ", "").replaceAll("# ", "")
      };
    }
  }
}
