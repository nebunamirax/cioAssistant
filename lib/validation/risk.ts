import { RISK_LEVELS, RISK_STATUSES } from "@/lib/domain/constants";
import { z } from "zod";

export const riskSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional().nullable(),
  impact: z.enum(RISK_LEVELS).default("MEDIUM"),
  probability: z.enum(RISK_LEVELS).default("MEDIUM"),
  criticality: z.enum(RISK_LEVELS).default("MEDIUM"),
  status: z.enum(RISK_STATUSES).default("OPEN"),
  mitigation: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  vendorId: z.string().optional().nullable(),
  ownerName: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable()
});

export const riskFilterSchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(RISK_STATUSES).optional(),
  criticality: z.enum(RISK_LEVELS).optional(),
  projectId: z.string().optional()
});

export type RiskInput = z.infer<typeof riskSchema>;
export type RiskFilters = z.infer<typeof riskFilterSchema>;
