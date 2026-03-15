import { CONTRACT_STATUSES, RENEWAL_TYPES } from "@/lib/domain/constants";
import { z } from "zod";

export const contractSchema = z.object({
  vendorId: z.string().min(1),
  projectId: z.string().optional().nullable(),
  title: z.string().min(3),
  contractType: z.string().optional().nullable(),
  status: z.enum(CONTRACT_STATUSES).default("DRAFT"),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  noticePeriodDays: z.number().int().nonnegative().optional().nullable(),
  amountPlanned: z.number().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
  renewalType: z.enum(RENEWAL_TYPES).default("NONE")
});

export const contractUpdateSchema = contractSchema.partial().extend({
  vendorId: z.string().min(1).optional(),
  title: z.string().min(3).optional()
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided"
});

export const contractFilterSchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(CONTRACT_STATUSES).optional(),
  renewalType: z.enum(RENEWAL_TYPES).optional(),
  expiringOnly: z.boolean().optional().default(false)
});

export type ContractInput = z.infer<typeof contractSchema>;
export type ContractUpdateInput = z.infer<typeof contractUpdateSchema>;
export type ContractFilters = z.infer<typeof contractFilterSchema>;
