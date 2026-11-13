import { z } from "zod";
import { externalStatuses, type ExternalItemInput } from "@/lib/domain/external-tracking";

export const maxTicketCsvSize = 1024 * 1024;
const maxTicketRows = 2000;
const column = z.number().int().min(0).max(99);
export const ticketMappingSchema = z.object({
  id: column,
  title: column,
  status: column.optional(),
  priority: column.optional(),
  major: column.optional(),
  assignees: column.optional(),
  dueDate: column.optional(),
  url: column.optional()
});

export const ticketStatusMappingsSchema = z.array(z.object({
  original: z.string().min(1).max(250),
  status: z.enum(externalStatuses)
})).max(maxTicketRows);

export type TicketMapping = z.infer<typeof ticketMappingSchema>;
export type TicketStatusMapping = z.infer<typeof ticketStatusMappingsSchema>[number];

function detectDelimiter(text: string) {
  const counts = { ";": 0, ",": 0, "\t": 0 };
  let quoted = false;
  for (const character of text) {
    if (character === '"') quoted = !quoted;
    if (quoted) continue;
    if (character === "\n" || character === "\r") break;
    if (character === ";" || character === "," || character === "\t") counts[character]++;
  }
  return (Object.keys(counts) as (keyof typeof counts)[]).sort((a, b) => counts[b] - counts[a])[0];
}

export function parseTicketCsv(raw: string) {
  if (Buffer.byteLength(raw) > maxTicketCsvSize) throw new Error("Le CSV dépasse 1 Mio.");
  const text = raw.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(text);
  const records: { line: number; values: string[] }[] = [];
  let state: "start" | "plain" | "quoted" | "closed" = "start";
  let value = "";
  let values: string[] = [];
  let line = 1;
  let recordLine = 1;

  function finishField() {
    values.push(value.trim());
    if (values.length > 100) throw new Error(`Ligne ${recordLine} · plus de 100 colonnes.`);
    value = "";
  }

  function finishRecord() {
    finishField();
    if (values.some(Boolean)) records.push({ line: recordLine, values });
    if (records.length > maxTicketRows + 1) throw new Error(`Le CSV dépasse ${maxTicketRows} lignes de données.`);
    values = [];
  }

  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (state === "quoted") {
      if (character === '"' && text[index + 1] === '"') {
        value += '"';
        index++;
      } else if (character === '"') {
        state = "closed";
      } else {
        value += character;
        if (character === "\n" || (character === "\r" && text[index + 1] !== "\n")) line++;
      }
      continue;
    }
    if (character === delimiter) {
      finishField();
      state = "start";
    } else if (character === "\r" || character === "\n") {
      if (character === "\r" && text[index + 1] === "\n") index++;
      finishRecord();
      recordLine = ++line;
      state = "start";
    } else if (character === '"' && state === "start") {
      state = "quoted";
    } else if (state === "closed" && character === " ") {
      continue;
    } else if (state === "closed" || character === '"') {
      throw new Error(`Ligne ${line} · guillemets CSV invalides.`);
    } else {
      value += character;
      state = "plain";
    }
  }
  if (state === "quoted") throw new Error(`Ligne ${recordLine} · champ entre guillemets non fermé.`);
  if (values.length || value) finishRecord();
  const [header, ...rows] = records;
  if (!header || header.values.length < 2 || !rows.length) throw new Error("Le CSV doit contenir un en-tête et au moins une ligne de données.");
  return { headers: header.values, rows };
}

function parseDueDate(value: string) {
  if (!value) return null;
  const french = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const dateOnly = french ? `${french[3]}-${french[2]}-${french[1]}` : value;
  if (z.string().date().safeParse(dateOnly).success) {
    const end = new Date(`${dateOnly}T23:59:59.999Z`);
    const offset = new Intl.DateTimeFormat("en", { timeZone: "Europe/Paris", timeZoneName: "longOffset" })
      .formatToParts(end).find((part) => part.type === "timeZoneName")?.value;
    return new Date(`${dateOnly}T23:59:59.999${offset?.replace("GMT", "") || "Z"}`);
  }
  if (z.string().datetime({ offset: true }).safeParse(value).success) return new Date(value);
  return null;
}

function parseLink(value: string) {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function previewTicketCsv(csv: ReturnType<typeof parseTicketCsv>, mapping: TicketMapping, statuses: TicketStatusMapping[]) {
  const columns = Object.values(mapping);
  if (new Set(columns).size !== columns.length || columns.some((index) => index >= csv.headers.length)) {
    throw new Error("Associe chaque champ à une colonne distincte du fichier.");
  }
  const statusMap = new Map(statuses.map(({ original, status }) => [original, status]));
  const observedStatuses = new Set<string>();
  const ids = new Set<string>();
  const items: ExternalItemInput[] = [];
  const errors: { line: number; message: string }[] = [];

  for (const { line, values } of csv.rows) {
    const get = (key: keyof TicketMapping) => values[mapping[key] ?? -1] ?? "";
    const externalId = get("id");
    const title = get("title");
    const originalStatus = get("status");
    const dueDate = parseDueDate(get("dueDate"));
    const url = parseLink(get("url"));
    const major = get("major").toLocaleLowerCase("fr");
    const problems: string[] = [];
    if (major && !/^(?:oui|non|yes|no|1|0|true|false|majeur|major)$/.test(major)) problems.push("classement majeur invalide");
    if (values.length !== csv.headers.length) problems.push("nombre de colonnes incorrect");
    if (!externalId) problems.push("identifiant manquant");
    if (!title) problems.push("titre manquant");
    if (externalId && ids.has(externalId)) problems.push(`identifiant dupliqué (${externalId.slice(0, 80)})`);
    if (externalId) ids.add(externalId);
    if (get("dueDate") && !dueDate) problems.push("échéance invalide");
    if (get("url") && !url) problems.push("lien HTTP ou HTTPS invalide");
    if (externalId.length > 250 || title.length > 500 || originalStatus.length > 250 || get("assignees").length > 500 || get("priority").length > 250 || get("url").length > 2048) {
      problems.push("valeur trop longue");
    }
    if (problems.length) {
      errors.push({ line, message: problems.join(", ") });
      continue;
    }
    if (originalStatus) observedStatuses.add(originalStatus);
    items.push({
      externalId, title, dueDate, url,
      status: statusMap.get(originalStatus) ?? "UNKNOWN",
      originalStatus: originalStatus || null,
      assignees: get("assignees"),
      ...(mapping.major !== undefined ? { major: /^(?:oui|yes|1|true|majeur|major)$/.test(major) } : {}),
      priority: get("priority") || null,
      progress: null
    });
  }

  return { items, errors, statuses: [...observedStatuses].sort((a, b) => a.localeCompare(b, "fr")) };
}
