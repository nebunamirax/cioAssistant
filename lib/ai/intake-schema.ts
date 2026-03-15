import { PROJECT_TYPES } from "@/lib/domain/constants";
import { z } from "zod";

export const intakeModuleSchema = z.enum(["actions", "projects", "vendors", "contracts", "budget", "communications"]);

export const intakeActionDraftSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  dueDate: z.string().datetime().nullable().optional()
});

export const intakeProjectDraftSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  type: z.enum(PROJECT_TYPES)
});

export const intakeVendorDraftSchema = z.object({
  name: z.string().min(2),
  category: z.string().optional(),
  mainContactEmail: z.string().email().optional(),
  notes: z.string().optional()
});

export const intakeContractDraftSchema = z.object({
  title: z.string().min(3),
  contractType: z.string().optional(),
  notes: z.string().optional()
});

export const intakeBudgetDraftSchema = z.object({
  title: z.string().min(3),
  category: z.string().optional(),
  plannedAmount: z.number().nonnegative().optional(),
  fiscalYear: z.number().int().min(2000).max(2100).optional(),
  notes: z.string().optional()
});

export const intakeCommunicationDraftSchema = z.object({
  title: z.string().min(3),
  type: z.string().optional(),
  contentText: z.string().min(1)
});

export const intakeAnalysisSchema = z.object({
  summary: z.string().min(1),
  modules: z.array(intakeModuleSchema).default([]),
  actions: z.array(intakeActionDraftSchema).default([]),
  project: intakeProjectDraftSchema.optional(),
  vendor: intakeVendorDraftSchema.optional(),
  contract: intakeContractDraftSchema.optional(),
  budgetItem: intakeBudgetDraftSchema.optional(),
  communication: intakeCommunicationDraftSchema.optional()
});

export type IntakeModule = z.infer<typeof intakeModuleSchema>;
export type IntakeActionDraft = z.infer<typeof intakeActionDraftSchema>;
export type IntakeProjectDraft = z.infer<typeof intakeProjectDraftSchema>;
export type IntakeVendorDraft = z.infer<typeof intakeVendorDraftSchema>;
export type IntakeContractDraft = z.infer<typeof intakeContractDraftSchema>;
export type IntakeBudgetDraft = z.infer<typeof intakeBudgetDraftSchema>;
export type IntakeCommunicationDraft = z.infer<typeof intakeCommunicationDraftSchema>;
export type IntakeAnalysis = z.infer<typeof intakeAnalysisSchema>;

export const intakeAnalysisJsonSchema = {
  name: "intake_analysis",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["summary", "modules", "actions"],
    properties: {
      summary: { type: "string" },
      modules: {
        type: "array",
        items: {
          type: "string",
          enum: ["actions", "projects", "vendors", "contracts", "budget", "communications"]
        }
      },
      actions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title"],
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            dueDate: { type: ["string", "null"] }
          }
        }
      },
      project: {
        type: "object",
        additionalProperties: false,
        required: ["title", "type"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          type: { type: "string", enum: [...PROJECT_TYPES] }
        }
      },
      vendor: {
        type: "object",
        additionalProperties: false,
        required: ["name"],
        properties: {
          name: { type: "string" },
          category: { type: "string" },
          mainContactEmail: { type: "string" },
          notes: { type: "string" }
        }
      },
      contract: {
        type: "object",
        additionalProperties: false,
        required: ["title"],
        properties: {
          title: { type: "string" },
          contractType: { type: "string" },
          notes: { type: "string" }
        }
      },
      budgetItem: {
        type: "object",
        additionalProperties: false,
        required: ["title"],
        properties: {
          title: { type: "string" },
          category: { type: "string" },
          plannedAmount: { type: "number" },
          fiscalYear: { type: "integer" },
          notes: { type: "string" }
        }
      },
      communication: {
        type: "object",
        additionalProperties: false,
        required: ["title", "contentText"],
        properties: {
          title: { type: "string" },
          type: { type: "string" },
          contentText: { type: "string" }
        }
      }
    }
  }
} as const;
