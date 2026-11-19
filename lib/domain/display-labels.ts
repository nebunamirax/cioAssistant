export const projectLabels: Record<string, string> = {
  DRAFT: "À cadrer",
  ACTIVE: "En cours",
  ON_HOLD: "En pause",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé"
};

export const actionLabels: Record<string, string> = {
  TODO: "À faire",
  IN_PROGRESS: "En cours",
  BLOCKED: "Bloquée",
  WAITING: "En attente",
  DONE: "Terminée"
};

export const priorityLabels: Record<string, string> = {
  LOW: "Basse",
  NORMAL: "Normale",
  HIGH: "Haute",
  CRITICAL: "Critique"
};

export const projectTypeLabels: Record<string, string> = {
  DEVELOPMENT: "Développement",
  DEPLOYMENT: "Déploiement",
  MIGRATION: "Migration",
  TRANSFORMATION: "Transformation",
  SUPPORT: "Support",
  INFRASTRUCTURE: "Infrastructure"
};

export const riskStatusLabels = { OPEN: "Ouvert", MITIGATING: "En traitement", ACCEPTED: "Accepté", CLOSED: "Clôturé" };
export const decisionStatusLabels = { PENDING: "À arbitrer", APPROVED: "Approuvée", REJECTED: "Rejetée", DEFERRED: "Reportée" };
export const riskLevelLabels = { LOW: "Faible", MEDIUM: "Moyenne", HIGH: "Élevée", CRITICAL: "Critique" };
