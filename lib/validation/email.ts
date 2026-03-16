import { z } from "zod";

export const emailFilterSchema = z.object({
  search: z.string().trim().optional(),
  linkedProjectId: z.string().trim().optional(),
  linkedActionId: z.string().trim().optional()
});

export const emailUpdateSchema = z.object({
  linkedProjectId: z.string().optional().nullable(),
  linkedActionId: z.string().optional().nullable()
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided"
});

export type EmailFilters = z.infer<typeof emailFilterSchema>;
export type EmailUpdateInput = z.infer<typeof emailUpdateSchema>;
