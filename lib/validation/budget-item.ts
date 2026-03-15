import { z } from "zod";

export const budgetItemSchema = z.object({
  title: z.string().min(3),
  category: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  contractId: z.string().optional().nullable(),
  vendorId: z.string().optional().nullable(),
  fiscalYear: z.number().int().min(2000).max(2100).optional().nullable(),
  plannedAmount: z.number().nonnegative().optional().nullable(),
  committedAmount: z.number().nonnegative().optional().nullable(),
  estimatedActualAmount: z.number().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable()
});

export const budgetItemUpdateSchema = budgetItemSchema.partial().extend({
  title: z.string().min(3).optional()
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided"
});

export const budgetItemFilterSchema = z.object({
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  fiscalYear: z.number().int().optional()
});

export type BudgetItemInput = z.infer<typeof budgetItemSchema>;
export type BudgetItemUpdateInput = z.infer<typeof budgetItemUpdateSchema>;
export type BudgetItemFilters = z.infer<typeof budgetItemFilterSchema>;
