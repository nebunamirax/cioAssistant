import { z } from "zod";
import { ACTION_STATUSES } from "@/lib/domain/constants";

export const objectiveFields = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(2000).nullable().optional(),
  ownerName: z.string().trim().max(120).nullable().optional(),
  targetDate: z.union([z.string().date(), z.string().datetime()]).nullable().optional()
}).strict();

export const milestoneFields = z.object({
  title: z.string().trim().min(3).max(160),
  projectId: z.string().min(1),
  dueDate: z.string().datetime().nullable().optional(),
  status: z.enum(ACTION_STATUSES).default("TODO")
}).strict();
