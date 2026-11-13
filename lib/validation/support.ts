import { z } from "zod";

const optional = z.string().trim().max(5000).nullable().optional();
export const serviceFields = z.object({
  title: z.string().trim().min(3).max(250),
  ownerId: optional, vendorId: optional, contractId: optional, scope: optional, notes: optional,
  escalationContact: optional, procedure: optional,
  criticality: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).nullable().optional()
}).strict();

export const controlFields = z.object({
  serviceId: z.string().min(1),
  checkedAt: z.string().datetime(),
  result: z.enum(["OK", "ANOMALY"]),
  evidence: z.string().trim().min(1).max(5000),
  nextDueAt: z.string().datetime()
}).strict();
