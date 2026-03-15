import { PRIORITIES, PROJECT_STATUSES, PROJECT_TYPES } from "@/lib/domain/constants";
import { z } from "zod";

export const projectSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional().nullable(),
  type: z.enum(PROJECT_TYPES),
  status: z.enum(PROJECT_STATUSES).default("DRAFT"),
  priority: z.enum(PRIORITIES).default("NORMAL"),
  ownerId: z.string().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  targetDate: z.string().datetime().optional().nullable()
});

export const projectUpdateSchema = projectSchema.partial().extend({
  title: z.string().min(3).optional(),
  type: z.enum(PROJECT_TYPES).optional()
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided"
});

export const projectFilterSchema = z.object({
  search: z.string().trim().optional(),
  type: z.enum(PROJECT_TYPES).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional()
});

export type ProjectInput = z.infer<typeof projectSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
export type ProjectFilters = z.infer<typeof projectFilterSchema>;
