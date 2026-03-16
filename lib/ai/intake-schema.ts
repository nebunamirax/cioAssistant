import { PROJECT_TYPES } from "@/lib/domain/constants";
import { z } from "zod";

export const intakeModuleSchema = z.enum(["actions", "projects", "vendors", "contracts", "budget", "communications"]);
export type IntakeModule = z.infer<typeof intakeModuleSchema>;

export const intakeActionDraftSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  projectId: z.string().optional().nullable(),
  contractId: z.string().optional().nullable(),
  vendorId: z.string().optional().nullable()
});

export const intakeProjectDraftSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  type: z.enum(PROJECT_TYPES).default("DEVELOPMENT"),
  status: z.string().optional(),
  priority: z.string().optional(),
  ownerId: z.string().optional().nullable(),
  startDate: z.string().datetime().nullable().optional(),
  targetDate: z.string().datetime().nullable().optional()
});

export const intakeVendorDraftSchema = z.object({
  name: z.string().min(2),
  category: z.string().optional(),
  mainContactName: z.string().optional(),
  mainContactEmail: z.string().email().optional(),
  notes: z.string().optional()
});

export const intakeContractDraftSchema = z.object({
  vendorId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  title: z.string().min(3),
  contractType: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  noticePeriodDays: z.number().int().nonnegative().nullable().optional(),
  amountPlanned: z.number().nonnegative().nullable().optional(),
  notes: z.string().optional(),
  renewalType: z.string().optional()
});

export const intakeBudgetDraftSchema = z.object({
  title: z.string().min(3),
  category: z.string().optional(),
  projectId: z.string().optional().nullable(),
  contractId: z.string().optional().nullable(),
  vendorId: z.string().optional().nullable(),
  plannedAmount: z.number().nonnegative().optional(),
  committedAmount: z.number().nonnegative().nullable().optional(),
  estimatedActualAmount: z.number().nonnegative().nullable().optional(),
  fiscalYear: z.number().int().min(2000).max(2100).optional(),
  notes: z.string().optional()
});

export const intakeCommunicationDraftSchema = z.object({
  title: z.string().min(3),
  type: z.string().optional(),
  status: z.string().optional(),
  contentText: z.string().min(1),
  contentMarkdown: z.string().optional(),
  projectId: z.string().optional().nullable(),
  actionId: z.string().optional().nullable(),
  contractId: z.string().optional().nullable()
});

export const intakeToolSchema = z.enum([
  "create_action",
  "create_project",
  "create_vendor",
  "create_contract",
  "create_budget_item",
  "create_communication"
]);

export const intakeToolCallSchema = z.discriminatedUnion("tool", [
  z.object({ tool: z.literal("create_action"), args: intakeActionDraftSchema }),
  z.object({ tool: z.literal("create_project"), args: intakeProjectDraftSchema }),
  z.object({ tool: z.literal("create_vendor"), args: intakeVendorDraftSchema }),
  z.object({ tool: z.literal("create_contract"), args: intakeContractDraftSchema }),
  z.object({ tool: z.literal("create_budget_item"), args: intakeBudgetDraftSchema }),
  z.object({ tool: z.literal("create_communication"), args: intakeCommunicationDraftSchema })
]);

export const intakeDecisionSchema = z.object({
  summary: z.string().min(1),
  primaryModule: intakeModuleSchema.nullable().optional(),
  routingConfidence: z.number().min(0).max(1).default(0),
  reviewRecommended: z.boolean().default(false),
  reviewReason: z.string().optional(),
  toolCalls: z.array(intakeToolCallSchema).default([])
});

export const intakePlanStepSchema = z.object({
  id: z.string().min(1),
  module: intakeModuleSchema,
  action: z.enum(["create"]),
  sourceText: z.string().min(1),
  dependsOn: z.string().nullable().optional(),
  relation: z.enum(["project_of"]).nullable().optional()
});

export const intakeExecutionPlanSchema = z.object({
  summary: z.string().min(1),
  steps: z.array(intakePlanStepSchema).default([])
});

export type IntakeActionDraft = z.infer<typeof intakeActionDraftSchema>;
export type IntakeProjectDraft = z.infer<typeof intakeProjectDraftSchema>;
export type IntakeVendorDraft = z.infer<typeof intakeVendorDraftSchema>;
export type IntakeContractDraft = z.infer<typeof intakeContractDraftSchema>;
export type IntakeBudgetDraft = z.infer<typeof intakeBudgetDraftSchema>;
export type IntakeCommunicationDraft = z.infer<typeof intakeCommunicationDraftSchema>;
export type IntakeTool = z.infer<typeof intakeToolSchema>;
export type IntakeToolCall = z.infer<typeof intakeToolCallSchema>;
export type IntakeDecision = z.infer<typeof intakeDecisionSchema>;
export type IntakePlanStep = z.infer<typeof intakePlanStepSchema>;
export type IntakeExecutionPlan = z.infer<typeof intakeExecutionPlanSchema>;

export function toolToModule(tool: IntakeTool): IntakeModule {
  if (tool === "create_action") return "actions";
  if (tool === "create_project") return "projects";
  if (tool === "create_vendor") return "vendors";
  if (tool === "create_contract") return "contracts";
  if (tool === "create_budget_item") return "budget";
  return "communications";
}

export function moduleToTool(module: IntakeModule): IntakeTool {
  if (module === "actions") return "create_action";
  if (module === "projects") return "create_project";
  if (module === "vendors") return "create_vendor";
  if (module === "contracts") return "create_contract";
  if (module === "budget") return "create_budget_item";
  return "create_communication";
}

export function getIntakeDraftSchema(module: IntakeModule) {
  if (module === "actions") return intakeActionDraftSchema;
  if (module === "projects") return intakeProjectDraftSchema;
  if (module === "vendors") return intakeVendorDraftSchema;
  if (module === "contracts") return intakeContractDraftSchema;
  if (module === "budget") return intakeBudgetDraftSchema;
  return intakeCommunicationDraftSchema;
}

export function getIntakeDraftJsonSchema(module: IntakeModule) {
  if (module === "actions") {
    return {
      name: "action_draft",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          dueDate: { type: ["string", "null"] },
          status: { type: "string" },
          priority: { type: "string" },
          projectId: { type: ["string", "null"] },
          contractId: { type: ["string", "null"] },
          vendorId: { type: ["string", "null"] }
        }
      }
    } as const;
  }

  if (module === "projects") {
    return {
      name: "project_draft",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          type: { type: "string", enum: [...PROJECT_TYPES] },
          status: { type: "string" },
          priority: { type: "string" },
          ownerId: { type: ["string", "null"] },
          startDate: { type: ["string", "null"] },
          targetDate: { type: ["string", "null"] }
        }
      }
    } as const;
  }

  if (module === "vendors") {
    return {
      name: "vendor_draft",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          category: { type: "string" },
          mainContactName: { type: "string" },
          mainContactEmail: { type: "string" },
          notes: { type: "string" }
        }
      }
    } as const;
  }

  if (module === "contracts") {
    return {
      name: "contract_draft",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          vendorId: { type: ["string", "null"] },
          projectId: { type: ["string", "null"] },
          title: { type: "string" },
          contractType: { type: "string" },
          status: { type: "string" },
          startDate: { type: ["string", "null"] },
          endDate: { type: ["string", "null"] },
          noticePeriodDays: { type: ["integer", "null"] },
          amountPlanned: { type: ["number", "null"] },
          notes: { type: "string" },
          renewalType: { type: "string" }
        }
      }
    } as const;
  }

  if (module === "budget") {
    return {
      name: "budget_draft",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          category: { type: "string" },
          projectId: { type: ["string", "null"] },
          contractId: { type: ["string", "null"] },
          vendorId: { type: ["string", "null"] },
          plannedAmount: { type: "number" },
          committedAmount: { type: ["number", "null"] },
          estimatedActualAmount: { type: ["number", "null"] },
          fiscalYear: { type: "integer" },
          notes: { type: "string" }
        }
      }
    } as const;
  }

  return {
    name: "communication_draft",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        type: { type: "string" },
        status: { type: "string" },
        contentText: { type: "string" },
        contentMarkdown: { type: "string" },
        projectId: { type: ["string", "null"] },
        actionId: { type: ["string", "null"] },
        contractId: { type: ["string", "null"] }
      }
    }
  } as const;
}

export const intakeDecisionJsonSchema = {
  name: "intake_decision",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["summary", "primaryModule", "routingConfidence", "reviewRecommended", "toolCalls"],
    properties: {
      summary: { type: "string" },
      primaryModule: {
        type: ["string", "null"],
        enum: ["actions", "projects", "vendors", "contracts", "budget", "communications", null]
      },
      routingConfidence: { type: "number" },
      reviewRecommended: { type: "boolean" },
      reviewReason: { type: "string" },
      toolCalls: {
        type: "array",
        items: {
          anyOf: [
            {
              type: "object",
              additionalProperties: false,
              required: ["tool", "args"],
              properties: {
                tool: { type: "string", enum: ["create_action"] },
                args: {
                  type: "object",
                  additionalProperties: false,
                  required: ["title"],
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    dueDate: { type: ["string", "null"] },
                    status: { type: "string" },
                    priority: { type: "string" },
                    projectId: { type: ["string", "null"] },
                    contractId: { type: ["string", "null"] },
                    vendorId: { type: ["string", "null"] }
                  }
                }
              }
            },
            {
              type: "object",
              additionalProperties: false,
              required: ["tool", "args"],
              properties: {
                tool: { type: "string", enum: ["create_project"] },
                args: {
                  type: "object",
                  additionalProperties: false,
                  required: ["title", "type"],
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    type: { type: "string", enum: [...PROJECT_TYPES] },
                    status: { type: "string" },
                    priority: { type: "string" },
                    ownerId: { type: ["string", "null"] },
                    startDate: { type: ["string", "null"] },
                    targetDate: { type: ["string", "null"] }
                  }
                }
              }
            },
            {
              type: "object",
              additionalProperties: false,
              required: ["tool", "args"],
              properties: {
                tool: { type: "string", enum: ["create_vendor"] },
                args: {
                  type: "object",
                  additionalProperties: false,
                  required: ["name"],
                  properties: {
                    name: { type: "string" },
                    category: { type: "string" },
                    mainContactName: { type: "string" },
                    mainContactEmail: { type: "string" },
                    notes: { type: "string" }
                  }
                }
              }
            },
            {
              type: "object",
              additionalProperties: false,
              required: ["tool", "args"],
              properties: {
                tool: { type: "string", enum: ["create_contract"] },
                args: {
                  type: "object",
                  additionalProperties: false,
                  required: ["title"],
                  properties: {
                    vendorId: { type: ["string", "null"] },
                    projectId: { type: ["string", "null"] },
                    title: { type: "string" },
                    contractType: { type: "string" },
                    status: { type: "string" },
                    startDate: { type: ["string", "null"] },
                    endDate: { type: ["string", "null"] },
                    noticePeriodDays: { type: ["integer", "null"] },
                    amountPlanned: { type: ["number", "null"] },
                    notes: { type: "string" },
                    renewalType: { type: "string" }
                  }
                }
              }
            },
            {
              type: "object",
              additionalProperties: false,
              required: ["tool", "args"],
              properties: {
                tool: { type: "string", enum: ["create_budget_item"] },
                args: {
                  type: "object",
                  additionalProperties: false,
                  required: ["title"],
                  properties: {
                    title: { type: "string" },
                    category: { type: "string" },
                    projectId: { type: ["string", "null"] },
                    contractId: { type: ["string", "null"] },
                    vendorId: { type: ["string", "null"] },
                    plannedAmount: { type: "number" },
                    committedAmount: { type: ["number", "null"] },
                    estimatedActualAmount: { type: ["number", "null"] },
                    fiscalYear: { type: "integer" },
                    notes: { type: "string" }
                  }
                }
              }
            },
            {
              type: "object",
              additionalProperties: false,
              required: ["tool", "args"],
              properties: {
                tool: { type: "string", enum: ["create_communication"] },
                args: {
                  type: "object",
                  additionalProperties: false,
                  required: ["title", "contentText"],
                  properties: {
                    title: { type: "string" },
                    type: { type: "string" },
                    status: { type: "string" },
                    contentText: { type: "string" },
                    contentMarkdown: { type: "string" },
                    projectId: { type: ["string", "null"] },
                    actionId: { type: ["string", "null"] },
                    contractId: { type: ["string", "null"] }
                  }
                }
              }
            }
          ]
        }
      }
    }
  }
} as const;

export const intakeExecutionPlanJsonSchema = {
  name: "intake_execution_plan",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["summary", "steps"],
    properties: {
      summary: { type: "string" },
      steps: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "module", "action", "sourceText", "dependsOn", "relation"],
          properties: {
            id: { type: "string" },
            module: { type: "string", enum: ["actions", "projects", "vendors", "contracts", "budget", "communications"] },
            action: { type: "string", enum: ["create"] },
            sourceText: { type: "string" },
            dependsOn: { type: ["string", "null"] },
            relation: { type: ["string", "null"], enum: ["project_of", null] }
          }
        }
      }
    }
  }
} as const;
