import { z } from "zod";
import { PROJECT_STATUSES } from "@/lib/domain/constants";
import { actionSchema } from "@/lib/validation/action";
import { budgetItemSchema } from "@/lib/validation/budget-item";
import { communicationBaseSchema } from "@/lib/validation/communication";
import { contractSchema } from "@/lib/validation/contract";
import { decisionSchema } from "@/lib/validation/decision";
import { meetingNoteSchema } from "@/lib/validation/meeting-note";
import { reportFields } from "@/lib/validation/monthly-report";
import { milestoneFields, objectiveFields } from "@/lib/validation/portfolio";
import { projectSchema } from "@/lib/validation/project";
import { riskSchema } from "@/lib/validation/risk";
import { controlFields, serviceFields } from "@/lib/validation/support";
import { vendorBaseSchema } from "@/lib/validation/vendor";

const name = z.string().trim().min(1).max(250).optional();
const action = actionSchema.extend({ projectName: name });
const risk = riskSchema.extend({ projectName: name });
const decision = decisionSchema.extend({ projectName: name });
const meeting = meetingNoteSchema.extend({ projectName: name });

export const entities = {
  objective: objectiveFields,
  project: projectSchema.extend({ ownerName: name }),
  milestone: milestoneFields.extend({ projectId: z.string().min(1).optional(), projectName: name }),
  action, service: serviceFields, control: controlFields, risk, decision, vendor: vendorBaseSchema,
  contract: contractSchema.extend({ projectName: name }),
  budget: budgetItemSchema.extend({ projectName: name }),
  meeting,
  communication: communicationBaseSchema.extend({ projectName: name }),
  report: reportFields
};

const names = ["objective", "project", "milestone", "action", "service", "control", "risk", "decision", "vendor", "contract", "budget", "meeting", "communication", "report", "member"] as const;
export const entityName = z.enum(names);
export type EntityName = z.infer<typeof entityName>;
export const keyField = z.string().min(8).max(120).describe("Clé stable pour cette écriture. Réutiliser la même clé lors d’un nouvel essai.");
export const idField = z.string().min(1).max(250);
export const searchFields = z.object({
  entity: entityName, query: z.string().max(250).optional(), cursor: idField.optional(), limit: z.number().int().min(1).max(100).default(20)
}).strict();
export const getFields = z.object({ entity: entityName, id: idField }).strict();
export const meetingBatch = z.object({
  key: keyField,
  meeting: meeting.strict(),
  actions: z.array(action.strict()).max(40).default([]),
  risks: z.array(risk.strict()).max(40).default([]),
  decisions: z.array(decision.strict()).max(40).default([])
}).strict();
export const reviewFields = z.object({ category: z.string().max(80).optional(), owner: name }).strict();
export const roadmapFields = z.object({
  projectId: idField.optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().nonnegative().default(0)
}).strict();
