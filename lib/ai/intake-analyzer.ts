import {
  type IntakeActionDraft,
  type IntakeBudgetDraft,
  type IntakeCommunicationDraft,
  type IntakeContractDraft,
  type IntakeDecision,
  type IntakeProjectDraft,
  type IntakeToolCall,
  type IntakeVendorDraft
} from "@/lib/ai/intake-schema";
import { PROJECT_TYPES, type ProjectType } from "@/lib/domain/constants";

function normalizeWhitespace(value: string) {
  return value.replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();
}

function toSummary(text: string) {
  return normalizeWhitespace(text).slice(0, 280);
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function cleanupTitle(value: string) {
  return normalizeWhitespace(value)
    .replace(/^[-*•\d.)\s]+/, "")
    .replace(/^(action|todo|to do|next step|prochaine etape|prochaine étape|a faire|à faire)\s*[:\-]\s*/i, "")
    .trim();
}

function buildFallbackTitle(prefix: string, sourceName?: string | null) {
  if (sourceName?.trim()) {
    return `${prefix} - ${sourceName.trim()}`;
  }

  return prefix;
}

function extractTaggedValue(text: string, labels: string[]) {
  for (const label of labels) {
    const pattern = new RegExp(`(?:^|\\n)\\s*${label}\\s*[:\\-]\\s*(.+)`, "i");
    const match = text.match(pattern);
    if (match?.[1]) {
      return cleanupTitle(match[1]);
    }
  }

  return null;
}

function extractEmail(text: string) {
  return text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)?.[0] ?? undefined;
}

function detectProjectType(text: string): ProjectType {
  const lowerText = text.toLowerCase();
  if (/(migration|switch|cutover|move)/.test(lowerText)) return "MIGRATION";
  if (/(deploy|deploiement|déploiement|rollout)/.test(lowerText)) return "DEPLOYMENT";
  if (/(infra|reseau|réseau|serveur|cloud)/.test(lowerText)) return "INFRASTRUCTURE";
  if (/(support|run|incident|ticket|maintenance)/.test(lowerText)) return "SUPPORT";
  if (/(transform|target operating model|tom)/.test(lowerText)) return "TRANSFORMATION";
  return PROJECT_TYPES[0];
}

function parseDateCandidate(rawValue: string) {
  const isoMatch = rawValue.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (isoMatch) {
    return new Date(`${isoMatch[1]}T09:00:00.000Z`).toISOString();
  }

  const frMatch = rawValue.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  if (frMatch) {
    const [, day, month, year] = frMatch;
    return new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T09:00:00.000Z`).toISOString();
  }

  return null;
}

function extractDateCandidates(text: string) {
  return Array.from(
    text.matchAll(/\b(?:20\d{2}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/20\d{2})\b/g)
  )
    .map((match) => parseDateCandidate(match[0]))
    .filter((value): value is string => value !== null);
}

function extractQuotedValue(text: string, labels: string[]) {
  for (const label of labels) {
    const pattern = new RegExp(`${label}[^"\\n]*"([^"]+)"`, "i");
    const match = text.match(pattern);
    if (match?.[1]) {
      return cleanupTitle(match[1]);
    }
  }

  return null;
}

function splitIntentClauses(text: string) {
  return text
    .split(/\s+(?:puis|et ensuite|ensuite|,\s*puis)\s+/i)
    .flatMap((segment) => segment.split(/\s+\bet\b\s+(?=(?:ajoute|ajouter|cree|créer|creer|ouvre|ouvrir|lance|lancer|planifie|planifier|rattache|lier)\b)/i))
    .map((segment) => normalizeWhitespace(segment))
    .filter(Boolean);
}

function hasProjectCreationIntent(text: string) {
  return /\b(cree|créer|creer|ouvre|ouvrir|lance|lancer|ajoute|ajouter)\b(?:\s+(?:un|une|le|la|ce|cet|cette))?\s+\b(projet|project|programme|initiative)\b/i.test(text)
    || /(?:^|\n)\s*(projet|project|programme|initiative)\s*[:\-]/i.test(text);
}

function extractProjectTitleFromCreationIntent(text: string) {
  const quoted = text.match(/\b(?:cree|créer|creer|ouvre|ouvrir|lance|lancer|ajoute|ajouter)\b(?:\s+(?:un|une|le|la|ce|cet|cette))?\s+\b(?:projet|project|programme|initiative)\b[^"\n]*"([^"]+)"/i);
  if (quoted?.[1]) {
    return cleanupTitle(quoted[1]);
  }

  const inline = text.match(/\b(?:cree|créer|creer|ouvre|ouvrir|lance|lancer|ajoute|ajouter)\b(?:\s+(?:un|une|le|la|ce|cet|cette))?\s+\b(?:projet|project|programme|initiative)\b\s+([^\n,.;:]+)/i);
  if (inline?.[1]) {
    return cleanupTitle(
      inline[1]
        .replace(/\b(?:avec|et|puis|pour)\b.*$/i, "")
        .trim()
    );
  }

  return null;
}

function extractReferencedProjectTitle(text: string) {
  const quotedMatch = text.match(/\b(?:au|sur le|dans le|pour le|rattache(?:r)?(?: a| à)?|lie(?:r)?(?: a| à)?)\s+projet[^"\n]*"([^"]+)"/i);
  if (quotedMatch?.[1]) {
    return cleanupTitle(quotedMatch[1]);
  }

  const inlineMatch = text.match(/\b(?:au|sur le|dans le|pour le|rattache(?:r)?(?: a| à)?|lie(?:r)?(?: a| à)?)\s+projet\s+([^\n,.;:]+)/i);
  if (inlineMatch?.[1]) {
    return cleanupTitle(inlineMatch[1]);
  }

  return null;
}

function extractProjectDraft(text: string, sourceName?: string | null): IntakeProjectDraft | undefined {
  const explicitTitle = extractTaggedValue(text, ["projet", "project", "programme", "initiative"])
    ?? extractQuotedValue(text, ["projet", "project", "programme", "initiative"]);
  const lowerText = text.toLowerCase();
  const dateCandidates = extractDateCandidates(text);
  const createProject = hasProjectCreationIntent(text);
  const intentTitle = createProject ? extractProjectTitleFromCreationIntent(text) : null;

  if (!createProject && !explicitTitle) {
    return undefined;
  }

  if (!explicitTitle && !/(projet|project|migration|deploiement|déploiement|programme|initiative)/.test(lowerText)) {
    return undefined;
  }

  const title = intentTitle ?? explicitTitle ?? buildFallbackTitle("Projet issu d'une ingestion IA", sourceName);
  return {
    title,
    description: toSummary(text),
    type: detectProjectType(text),
    startDate: dateCandidates[0],
    targetDate: dateCandidates[1]
  };
}

function extractVendorDraft(text: string): IntakeVendorDraft | undefined {
  const name = extractTaggedValue(text, ["prestataire", "fournisseur", "vendor", "provider"]);
  const lowerText = text.toLowerCase();

  if (!name && !/(prestataire|fournisseur|vendor|provider|éditeur|editeur)/.test(lowerText)) {
    return undefined;
  }

  return {
    name: name ?? "Prestataire à qualifier",
    category: extractTaggedValue(text, ["categorie", "catégorie", "category"]) ?? undefined,
    mainContactEmail: extractEmail(text),
    notes: toSummary(text)
  };
}

function extractContractDraft(text: string, sourceName?: string | null): IntakeContractDraft | undefined {
  const title = extractTaggedValue(text, ["contrat", "contract", "licence", "msa", "sow"]);
  const lowerText = text.toLowerCase();

  if (!title && !/(contrat|contract|licence|renewal|renouvellement|msa|sow)/.test(lowerText)) {
    return undefined;
  }

  return {
    title: title ?? buildFallbackTitle("Contrat à qualifier", sourceName),
    contractType: extractTaggedValue(text, ["type de contrat", "contract type", "type"]) ?? undefined,
    notes: toSummary(text)
  };
}

function parseAmount(rawValue: string) {
  const normalized = rawValue.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : undefined;
}

function extractBudgetDraft(text: string, sourceName?: string | null): IntakeBudgetDraft | undefined {
  const lowerText = text.toLowerCase();
  const budgetLineMatch = text.match(/(?:^|\n)\s*(?:budget|ligne budgetaire|ligne budgétaire|cost item)\s*[:\-]\s*(.+)/i);
  const budgetLine = budgetLineMatch?.[1]?.trim();
  const amountMatch = budgetLine?.match(/(\d[\d\s.,]*\s?(?:k|m)?\s?(?:€|eur|euros?)?)\s*$/i)
    ?? text.match(/(?:montant|co[uû]t|cost|capex|opex)[^0-9]{0,20}(\d[\d\s.,]*\s?(?:k|m)?\s?(?:€|eur|euros?)?)/i);
  const explicitTitle = extractTaggedValue(text, ["budget", "ligne budgetaire", "ligne budgétaire", "cost item"]);

  if (!amountMatch && !explicitTitle && !/(budget|capex|opex|co[uû]t|cost|montant)/.test(lowerText)) {
    return undefined;
  }

  const fiscalYearMatch = text.match(/\b(20\d{2})\b/);
  const plannedAmount = amountMatch?.[1]
    ? (() => {
        const rawAmount = amountMatch[1].trim().toLowerCase();
        const multiplier = rawAmount.includes("m") ? 1_000_000 : rawAmount.includes("k") ? 1_000 : 1;
        const parsed = parseAmount(rawAmount);
        return parsed !== undefined ? parsed * multiplier : undefined;
      })()
    : undefined;

  return {
    title:
      budgetLine?.replace(/\s*[-–]\s*\d[\d\s.,]*\s?(?:k|m)?\s?(?:€|eur|euros?)?\s*$/i, "").trim()
      || explicitTitle
      || buildFallbackTitle("Budget issu d'une ingestion IA", sourceName),
    category: /(capex)/i.test(text) ? "CAPEX" : /(opex)/i.test(text) ? "OPEX" : undefined,
    plannedAmount,
    fiscalYear: fiscalYearMatch ? Number(fiscalYearMatch[1]) : undefined,
    notes: toSummary(text)
  };
}

function extractCommunicationDraft(text: string, sourceName?: string | null): IntakeCommunicationDraft | undefined {
  const lowerText = text.toLowerCase();
  const explicitTitle = extractTaggedValue(text, ["communication", "message", "email", "mail", "announcement", "annonce"]);

  if (!explicitTitle && !/(communication|mail|email|annonce|status report|codir|comex|newsletter)/.test(lowerText)) {
    return undefined;
  }

  return {
    title: explicitTitle ?? buildFallbackTitle("Communication issue d'une ingestion IA", sourceName),
    type: /(incident)/i.test(text) ? "incident-update" : /(codir|comex)/i.test(text) ? "executive-update" : "generic-note",
    contentText: text.trim()
  };
}

function extractActionLines(text: string) {
  const bulletActions = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) =>
      /^[-*•]/.test(line) ||
      /^\d+[.)]/.test(line) ||
      /^(action|todo|to do|next step|prochaine etape|prochaine étape|a faire|à faire)\b/i.test(line)
    );

  const inlineActionMatches = Array.from(
    text.matchAll(/(?:liste d['’]actions?|liste des actions|actions?)[\s:-]+(.+)/gi)
  );
  const inlineActions = inlineActionMatches.flatMap((match) =>
    match[1]
      .split(/[,;]\s*/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 3)
  );

  return [...bulletActions, ...inlineActions];
}

function extractRequestedActionSentence(text: string) {
  const normalized = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .find((line) => /\b(peux[- ]?tu|pourrais[- ]?tu|tu peux|tu pourrais|merci de|il faudrait|j['’]ai besoin que tu|changer|ajouter|installer|mettre a jour|mettre à jour|remplacer)\b/i.test(line));

  if (!normalized) {
    return null;
  }

  return normalized
    .replace(/^(hello|bonjour|salut)\s+[a-zà-ÿ-]+,?\s*/i, "")
    .replace(/^(tu peux|tu pourrais|peux[- ]?tu|pourrais[- ]?tu|merci de|il faudrait)\s*/i, "")
    .replace(/\bstp\b/gi, "")
    .replace(/\bmerci.*$/i, "")
    .replace(/[?!]+$/g, "")
    .trim();
}

function extractActionTitleFromRequest(text: string) {
  const quotedAction = extractQuotedValue(text, ["action", "todo", "tache", "tâche", "task"]);
  if (quotedAction) {
    return quotedAction;
  }

  const explicitActionMatch = text.match(/\b(?:ajoute|ajouter|cree|créer|creer|ouvre|ouvrir)\b[^.\n]{0,30}\baction\b\s+([^\n,.;:]+)/i);
  if (!explicitActionMatch?.[1]) {
    return null;
  }

  return cleanupTitle(
    explicitActionMatch[1]
      .replace(/\b(?:au|sur le|dans le|pour le)\s+projet\b.*$/i, "")
      .trim()
  );
}

function extractActions(text: string, sourceName?: string | null): IntakeActionDraft[] {
  const explicitRequestedAction = extractActionTitleFromRequest(text);
  if (explicitRequestedAction) {
    return [
      {
        title: explicitRequestedAction,
        description: toSummary(text),
        dueDate: parseDateCandidate(text)
      }
    ];
  }

  const extracted = extractActionLines(text)
    .map<IntakeActionDraft | null>((line) => {
      const title = cleanupTitle(line);
      if (title.length < 3) {
        return null;
      }

      return {
        title,
        description: toSummary(text),
        dueDate: parseDateCandidate(line)
      };
    })
    .filter((item): item is IntakeActionDraft => item !== null);

  if (extracted.length > 0) {
    return uniqueBy(extracted, (item) => item.title.toLowerCase());
  }

  if (/(action|todo|next step|prochaine etape|prochaine étape|a faire|à faire|decision|décision)/i.test(text)) {
    return [
      {
        title: buildFallbackTitle("Action à qualifier", sourceName),
        description: toSummary(text),
        dueDate: parseDateCandidate(text)
      }
    ];
  }

  const requestedAction = extractRequestedActionSentence(text);
  if (requestedAction && requestedAction.length >= 3) {
    return [
      {
        title: cleanupTitle(requestedAction),
        description: toSummary(text),
        dueDate: parseDateCandidate(text)
      }
    ];
  }

  return [];
}

export function analyzeIntakeText(text: string, sourceName?: string | null): IntakeDecision {
  const normalizedText = normalizeWhitespace(text);
  const clauses = splitIntentClauses(normalizedText);
  const projectClause = clauses.find((clause) => hasProjectCreationIntent(clause)) ?? normalizedText;
  const actionClauses = clauses.filter((clause) =>
    /\b(action|todo|task|tache|tâche|ajoute|ajouter|cree|créer|creer|ouvre|ouvrir)\b/i.test(clause)
  );
  const project = extractProjectDraft(projectClause, sourceName);
  const referencedProjectTitle = extractReferencedProjectTitle(normalizedText);
  const vendor = extractVendorDraft(normalizedText);
  const contract = extractContractDraft(normalizedText, sourceName);
  const budgetItem = extractBudgetDraft(normalizedText, sourceName);
  const communication = extractCommunicationDraft(normalizedText, sourceName);
  const actions = uniqueBy(
    (actionClauses.length > 0 ? actionClauses.flatMap((clause) => extractActions(clause, sourceName)) : extractActions(normalizedText, sourceName)),
    (action) => action.title.toLowerCase()
  );

  const toolCalls: IntakeToolCall[] = [
    ...(project ? [{ tool: "create_project" as const, args: project }] : []),
    ...(vendor ? [{ tool: "create_vendor" as const, args: vendor }] : []),
    ...(contract ? [{ tool: "create_contract" as const, args: contract }] : []),
    ...(budgetItem ? [{ tool: "create_budget_item" as const, args: budgetItem }] : []),
    ...(communication ? [{ tool: "create_communication" as const, args: communication }] : []),
    ...actions.map((action) => ({ tool: "create_action" as const, args: action }))
  ];
  const primaryModule = project
    ? "projects"
    : vendor
      ? "vendors"
      : contract
        ? "contracts"
        : budgetItem
          ? "budget"
          : communication
            ? "communications"
            : actions.length > 0
              ? "actions"
              : undefined;

  return {
    summary: toSummary(normalizedText),
    primaryModule,
    routingConfidence: toolCalls.length > 0 ? 0.72 : 0.2,
    reviewRecommended: toolCalls.length === 0,
    reviewReason: toolCalls.length === 0
      ? referencedProjectTitle
        ? `Projet mentionne: ${referencedProjectTitle}. Aucun module clair détecté par l’analyse locale.`
        : "Aucun module clair détecté par l’analyse locale."
      : undefined,
    toolCalls
  };
}
