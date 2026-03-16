import { ACTION_STATUSES, PRIORITIES } from "@/lib/domain/constants";
import { z } from "zod";

export const actionSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  ownerName: z.string().optional().nullable(),
  status: z.enum(ACTION_STATUSES).default("TODO"),
  priority: z.enum(PRIORITIES).default("NORMAL"),
  dueDate: z.string().datetime().optional().nullable(),
  projectId: z.string().optional().nullable(),
  contractId: z.string().optional().nullable(),
  vendorId: z.string().optional().nullable(),
  sourceType: z.string().optional().nullable(),
  sourceRef: z.string().optional().nullable()
});

export const actionUpdateSchema = actionSchema.partial().extend({
  title: z.string().min(3).optional()
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided"
});

export const actionFilterSchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(ACTION_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  overdueOnly: z.boolean().optional().default(false)
});

export type ActionInput = z.infer<typeof actionSchema>;
export type ActionUpdateInput = z.infer<typeof actionUpdateSchema>;
export type ActionFilters = z.infer<typeof actionFilterSchema>;
