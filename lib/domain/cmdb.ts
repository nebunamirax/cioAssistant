export const cmdbTypes = {
  APPLICATION: "Application",
  SAAS: "Service SaaS",
  SERVER: "Serveur",
  DATABASE: "Base de données",
  NETWORK: "Équipement réseau",
  ENDPOINT: "Poste de travail",
  STORAGE: "Stockage",
  OTHER: "Autre"
};

export const cmdbStatuses = {
  PLANNED: "Planifié",
  ACTIVE: "En service",
  MAINTENANCE: "En maintenance",
  RETIRED: "Retiré"
};

export const cmdbEnvironments = {
  PRODUCTION: "Production",
  PREPRODUCTION: "Préproduction",
  TEST: "Test",
  DEVELOPMENT: "Développement",
  SHARED: "Transverse"
};

export const cmdbCriticalities = {
  STANDARD: "Standard",
  HIGH: "Élevée",
  CRITICAL: "Critique"
};

export const cmdbRelationTypes = {
  DEPENDS_ON: "dépend de",
  HOSTED_ON: "est hébergé sur",
  MONITORED_BY: "est supervisé par"
};

export function cmdbLabel(labels: Record<string, string>, value: string) {
  return Object.hasOwn(labels, value) ? labels[value] : value;
}
