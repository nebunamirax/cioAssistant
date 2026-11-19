import { z } from "zod";
import { ACTION_STATUSES, CONTRACT_STATUSES, DECISION_STATUSES, PROJECT_STATUSES, RISK_STATUSES } from "@/lib/domain/constants";

export const workspaceEntities = ["project", "action", "risk", "decision", "contract", "budget", "meeting", "service"] as const;
export const workspaceEntityLabels = {
  project: "Projets", action: "Actions", risk: "Risques", decision: "Décisions",
  contract: "Contrats", budget: "Budget", meeting: "Réunions", service: "Services"
};
export const workspaceStatusOptions: Record<typeof workspaceEntities[number], readonly string[]> = {
  project: PROJECT_STATUSES, action: ACTION_STATUSES, risk: RISK_STATUSES, decision: DECISION_STATUSES,
  contract: CONTRACT_STATUSES, budget: [], meeting: [], service: []
};
const id = z.string().trim().min(1).max(250);
export const workspaceViewFields = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1).max(120),
  entity: z.enum(workspaceEntities),
  layout: z.enum(["table", "kanban"]).default("table"),
  projectId: id.nullable().default(null),
  status: z.string().trim().max(50).default(""),
  query: z.string().trim().max(250).default("")
}).strict().superRefine((view, context) => {
  if (view.status && !workspaceStatusOptions[view.entity].includes(view.status)) {
    context.addIssue({ code: "custom", message: "Le statut ne correspond pas au type de fiche." });
  }
  if (view.projectId && view.entity === "service") {
    context.addIssue({ code: "custom", message: "Le filtre projet ne s’applique pas aux services." });
  }
  if (view.layout === "kanban" && ["budget", "meeting", "service"].includes(view.entity)) {
    context.addIssue({ code: "custom", message: "Choisissez un tableau pour ces fiches." });
  }
});
export const workspaceViews = z.array(workspaceViewFields).max(8).refine(
  (views) => new Set(views.map((view) => view.id)).size === views.length,
  "Chaque vue doit avoir un identifiant distinct."
);
export const workspacePageFields = z.object({
  title: z.string().trim().min(1).max(250),
  parentId: id.nullable().default(null),
  contentMarkdown: z.string().max(200000).default(""),
  contentBlocks: z.array(z.record(z.string(), z.unknown())).max(5000).optional(),
  views: workspaceViews.default([])
});
export const workspaceListFields = z.object({
  query: z.string().trim().max(250).default(""),
  parentId: id.nullable().optional(),
  cursor: id.optional(),
  limit: z.number().int().min(1).max(100).default(30)
}).strict();
export const workspaceViewReadFields = z.object({
  pageId: id, viewId: z.uuid(),
  cursor: id.optional(), limit: z.number().int().min(1).max(100).default(30)
}).strict();
export type WorkspaceView = z.infer<typeof workspaceViewFields>;
