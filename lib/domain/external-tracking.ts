export const externalStatuses = ["UNKNOWN", "TODO", "IN_PROGRESS", "BLOCKED", "DONE"] as const;
export type ExternalStatus = (typeof externalStatuses)[number];

export const externalStatusLabels: Record<ExternalStatus, string> = {
  UNKNOWN: "Non classé",
  TODO: "À faire",
  IN_PROGRESS: "En cours",
  BLOCKED: "Bloqué",
  DONE: "Terminé"
};

export function externalStatusLabel(status: string) {
  return externalStatusLabels[status as ExternalStatus] ?? status;
}

export function externalSourceLabel(kind: string) {
  return kind === "PLANNER" ? "Planner" : "Ticketing CSV";
}

export type ExternalItemInput = {
  externalId: string;
  title: string;
  status: ExternalStatus;
  originalStatus: string | null;
  assignees: string;
  major?: boolean;
  priority: string | null;
  dueDate: Date | null;
  progress: number | null;
  url: string | null;
};
