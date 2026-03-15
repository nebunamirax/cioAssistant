import {
  type IntakeActionDraft,
  type IntakeAnalysis,
  type IntakeBudgetDraft,
  type IntakeCommunicationDraft,
  type IntakeContractDraft,
  type IntakeProjectDraft,
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

function extractProjectDraft(text: string, sourceName?: string | null): IntakeProjectDraft | undefined {
  const explicitTitle = extractTaggedValue(text, ["projet", "project", "programme", "initiative"]);
  const lowerText = text.toLowerCase();

  if (!explicitTitle && !/(projet|project|migration|deploiement|déploiement|programme|initiative)/.test(lowerText)) {
    return undefined;
  }

  const title = explicitTitle ?? buildFallbackTitle("Projet issu d'une ingestion IA", sourceName);
  return {
    title,
    description: toSummary(text),
    type: detectProjectType(text)
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

function extractActionLines(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) =>
      /^[-*•]/.test(line) ||
      /^\d+[.)]/.test(line) ||
      /^(action|todo|to do|next step|prochaine etape|prochaine étape|a faire|à faire)\b/i.test(line)
    );
}

function extractActions(text: string, sourceName?: string | null): IntakeActionDraft[] {
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

  return [];
}

export function analyzeIntakeText(text: string, sourceName?: string | null): IntakeAnalysis {
  const normalizedText = normalizeWhitespace(text);
  const project = extractProjectDraft(normalizedText, sourceName);
  const vendor = extractVendorDraft(normalizedText);
  const contract = extractContractDraft(normalizedText, sourceName);
  const budgetItem = extractBudgetDraft(normalizedText, sourceName);
  const communication = extractCommunicationDraft(normalizedText, sourceName);
  let actions = extractActions(normalizedText, sourceName);

  if (!project && !vendor && !contract && !budgetItem && !communication && actions.length === 0) {
    actions = [
      {
        title: buildFallbackTitle("Action issue d'une ingestion IA", sourceName),
        description: toSummary(normalizedText)
      }
    ];
  }

  const modules = [
    ...(project ? (["projects"] as const) : []),
    ...(vendor ? (["vendors"] as const) : []),
    ...(contract ? (["contracts"] as const) : []),
    ...(budgetItem ? (["budget"] as const) : []),
    ...(communication ? (["communications"] as const) : []),
    ...(actions.length > 0 ? (["actions"] as const) : [])
  ];

  return {
    summary: toSummary(normalizedText),
    modules,
    actions,
    project,
    vendor,
    contract,
    budgetItem,
    communication
  };
}
