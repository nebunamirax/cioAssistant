import { getAIProvider } from "@/lib/ai/provider-factory";

type MeetingActionDraftSuggestion = {
  title: string;
  ownerName: string | null;
  dueDate: string | null;
  notes: string | null;
  createdActionId: string | null;
};

type MeetingDraftSuggestion = {
  suggestedTitle: string;
  summary: string;
  attendees: string[];
  extractedActions: MeetingActionDraftSuggestion[];
  extractedDecisions: string[];
  extractedRisks: string[];
  extractedDeadlines: string[];
};

function normalizeLine(value: string) {
  return value
    .replace(/\b\d{2}:\d{2}:\d{2}(?:[.,]\d{3})?\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLines(rawContent: string) {
  return rawContent
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.map((value) => normalizeLine(value)).filter(Boolean)));
}

function takeFirstSentence(value: string, maxLength = 80) {
  const sentence = normalizeLine(value).split(/[.!?]/)[0] ?? "";
  return sentence.length > maxLength ? `${sentence.slice(0, maxLength - 1).trim()}…` : sentence;
}

function deriveTitle(rawContent: string, meetingDate?: string | null) {
  const lines = normalizeLines(rawContent);
  const explicitTitle = lines.find((line) => /^(reunion|réunion|codir|comex|copil|standup|atelier|point)\b/i.test(line));

  if (explicitTitle) {
    return takeFirstSentence(explicitTitle, 72);
  }

  const firstMeaningfulLine = lines.find((line) => line.length >= 6);
  if (firstMeaningfulLine) {
    return takeFirstSentence(firstMeaningfulLine, 72);
  }

  if (meetingDate) {
    const date = new Date(meetingDate);
    if (!Number.isNaN(date.getTime())) {
      return `Reunion du ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date)}`;
    }
  }

  return "Reunion";
}

function extractAttendees(lines: string[]) {
  const attendees = lines.flatMap((line) => {
    const match = line.match(/^(participants?|presents?|présents?)\s*[:\-]\s*(.+)$/i);
    if (!match?.[2]) {
      return [];
    }

    return match[2]
      .split(/[,;/]/)
      .map((item) => normalizeLine(item))
      .filter((item) => item.length >= 2);
  });

  return dedupe(attendees);
}

function extractByKeywords(lines: string[], patterns: RegExp[]) {
  return dedupe(
    lines.flatMap((line) => {
      const normalized = normalizeLine(line.replace(/^[-*•]\s*/, ""));
      return patterns.some((pattern) => pattern.test(normalized)) ? [normalized] : [];
    })
  );
}

function inferOwnerName(value: string) {
  const ownerPatterns = [
    /\b(?:owner|responsable|porteur|assignee|assigné(?:e)?)\s*[:\-]\s*([A-Z][\w.-]+(?:\s+[A-Z][\w.-]+){0,2})/i,
    /^([A-Z][\w.-]+(?:\s+[A-Z][\w.-]+){0,2})\s+(?:doit|va|prend|pilotera|s'occupe de|est charge(?:e)? de)\b/i
  ];

  for (const pattern of ownerPatterns) {
    const match = value.match(pattern);
    if (match?.[1]) {
      return normalizeLine(match[1]);
    }
  }

  return null;
}

function inferDueDate(value: string) {
  const explicitIso = value.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (explicitIso?.[1]) {
    return new Date(`${explicitIso[1]}T09:00:00.000Z`).toISOString();
  }

  const explicitSlash = value.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  if (explicitSlash) {
    const [, day, month, year] = explicitSlash;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 9, 0, 0)).toISOString();
  }

  const explicitFrenchDate = value.match(
    /\b(\d{1,2})\s+(janvier|fevrier|février|mars|avril|mai|juin|juillet|aout|août|septembre|octobre|novembre|decembre|décembre)\s+(20\d{2})\b/i
  );
  if (explicitFrenchDate) {
    const [, day, monthLabel, year] = explicitFrenchDate;
    const normalizedMonth = monthLabel.toLowerCase();
    const monthIndex = [
      "janvier",
      "fevrier",
      "février",
      "mars",
      "avril",
      "mai",
      "juin",
      "juillet",
      "aout",
      "août",
      "septembre",
      "octobre",
      "novembre",
      "decembre",
      "décembre"
    ].findIndex((month) => month === normalizedMonth);

    if (monthIndex >= 0) {
      const canonicalMonthIndex = [0, 1, 1, 2, 3, 4, 5, 6, 7, 7, 8, 9, 10, 11, 11][monthIndex] ?? monthIndex;
      return new Date(Date.UTC(Number(year), canonicalMonthIndex, Number(day), 9, 0, 0)).toISOString();
    }
  }

  return null;
}

function normalizeActionTitle(value: string) {
  return normalizeLine(
    value
      .replace(/^[-*•]\s*/, "")
      .replace(/^(action|todo|to do|a faire|à faire|next step)\s*[:\-]\s*/i, "")
      .replace(/^(?:il faut|merci de|penser a|penser à|on doit)\s+/i, "")
      .replace(/^[A-Z][\w.-]+(?:\s+[A-Z][\w.-]+){0,2}\s+(?:doit|va|prend|pilotera|s'occupe de|est charge(?:e)? de)\s+/i, "")
      .replace(/\b(?:owner|responsable|porteur|assignee|assigné(?:e)?)\s*[:\-]\s*[A-Z][\w.-]+(?:\s+[A-Z][\w.-]+){0,2}.*/i, "")
      .replace(/\b(?:avant le|pour le|d'ici le|au plus tard le)\s+\d{1,2}\/\d{1,2}\/20\d{2}.*/i, "")
      .replace(/\b(?:avant le|pour le|d'ici le|au plus tard le)\s+20\d{2}-\d{2}-\d{2}.*/i, "")
      .replace(/\b(?:avant le|pour le|d'ici le|au plus tard le|le)\s+\d{1,2}\s+(?:janvier|fevrier|février|mars|avril|mai|juin|juillet|aout|août|septembre|octobre|novembre|decembre|décembre)\s+20\d{2}.*/i, "")
      .replace(/[.!?]\s*$/, "")
  );
}

function extractActionDrafts(lines: string[]): MeetingActionDraftSuggestion[] {
  const candidates = lines.filter((line) => {
    const normalized = normalizeLine(line.replace(/^[-*•]\s*/, ""));
    return (
      /^(action|todo|to do|a faire|à faire|next step)\b/i.test(normalized) ||
      /\b(responsable|owner|porteur)\b/i.test(normalized) ||
      /^(?:il faut|merci de|penser a|penser à|on doit)\b/i.test(normalized) ||
      /^[A-Z][\w.-]+(?:\s+[A-Z][\w.-]+){0,2}\s+(?:doit|va|prend|pilotera|s'occupe de|est charge(?:e)? de)\b/i.test(normalized) ||
      /^(?:relancer|preparer|préparer|valider|envoyer|faire|planifier|confirmer|produire|livrer|organiser|verifier|vérifier|contacter|partager|rediger|rédiger|mettre a jour|mettre à jour|lancer|suivre|analyser|corriger|tester|documenter|traiter|ouvrir|fermer|prioriser|arbitrer)\b/i.test(normalized)
    );
  });

  return dedupe(candidates)
    .flatMap((line): MeetingActionDraftSuggestion[] => {
      const title = normalizeActionTitle(line);

      if (title.length < 3) {
        return [];
      }

      return [{
        title,
        ownerName: inferOwnerName(line),
        dueDate: inferDueDate(line),
        notes: normalizeLine(line.replace(/^[-*•]\s*/, "")) || null,
        createdActionId: null
      }];
    });
}

function extractDeadlines(lines: string[]) {
  const deadlinePatterns = [
    /\b(echeance|échéance|deadline|jalon|avant le|pour le|d'ici le|au plus tard|next step d'ici)\b/i,
    /\b\d{1,2}\/\d{1,2}\/20\d{2}\b/,
    /\b20\d{2}-\d{2}-\d{2}\b/,
    /\b\d{1,2}\s+(janvier|fevrier|février|mars|avril|mai|juin|juillet|aout|août|septembre|octobre|novembre|decembre|décembre)\b/i
  ];

  return extractByKeywords(lines, deadlinePatterns);
}

function buildHeuristicSummary(lines: string[]) {
  const summaryLines = lines
    .filter((line) => !/^(participants?|presents?|présents?)\s*[:\-]/i.test(line))
    .slice(0, 5)
    .map((line) => normalizeLine(line.replace(/^[-*•]\s*/, "")));

  return summaryLines.join(" ").slice(0, 600).trim();
}

function normalizeProviderSummary(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function generateMeetingNoteDraft(rawContent: string, meetingDate?: string | null): Promise<MeetingDraftSuggestion> {
  const normalizedRaw = rawContent.trim();
  const lines = normalizeLines(normalizedRaw);
  const provider = getAIProvider();
  let summary = buildHeuristicSummary(lines);

  try {
    const aiResult = await Promise.race([
      provider.summarize({
        text: normalizedRaw,
        context: {
          format: "meeting-note"
        }
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Meeting draft summary timeout")), 3500);
      })
    ]);

    const aiSummary = normalizeProviderSummary(
      aiResult.data.summary ?? aiResult.data.text
    );

    if (aiSummary) {
      summary = aiSummary;
    }
  } catch {
    // Keep heuristic fallback when provider is unavailable or not configured.
  }

  return {
    suggestedTitle: deriveTitle(normalizedRaw, meetingDate),
    summary,
    attendees: extractAttendees(lines),
    extractedActions: extractActionDrafts(lines),
    extractedDecisions: extractByKeywords(lines, [
      /^(decision|décision|arbitrage|validation)\b/i,
      /\b(decide|décide|valide|acte|retenu)\b/i
    ]),
    extractedRisks: extractByKeywords(lines, [
      /^(risque|alerte|blocage|bloquant)\b/i,
      /\b(risque|alerte|dependance|dépendance|retard|blocage)\b/i
    ]),
    extractedDeadlines: extractDeadlines(lines)
  };
}

export type { MeetingActionDraftSuggestion, MeetingDraftSuggestion };
