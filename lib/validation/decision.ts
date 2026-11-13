import { DECISION_STATUSES } from "@/lib/domain/constants";
import { z } from "zod";

export const decisionSchema = z.object({
  subject: z.string().min(3),
  context: z.string().optional().nullable(),
  options: z.array(z.string().min(1)).optional().default([]),
  recommendation: z.string().optional().nullable(),
  decider: z.string().optional().nullable(),
  status: z.enum(DECISION_STATUSES).default("PENDING"),
  targetDate: z.string().datetime().optional().nullable(),
  projectId: z.string().optional().nullable(),
  contractId: z.string().optional().nullable(),
  budgetItemId: z.string().optional().nullable()
});

export const decisionFilterSchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(DECISION_STATUSES).optional(),
  projectId: z.string().optional()
});

export type DecisionInput = z.infer<typeof decisionSchema>;
export type DecisionFilters = z.infer<typeof decisionFilterSchema>;
