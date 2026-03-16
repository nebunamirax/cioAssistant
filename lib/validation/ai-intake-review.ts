import { z } from "zod";

import { intakeModuleSchema } from "@/lib/ai/intake-schema";

export const aiIntakeReviewStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);

export const aiIntakeReviewQueueSchema = z.object({
  sourceName: z.string().trim().optional().nullable(),
  rawText: z.string().trim().min(1),
  providerMode: z.string().min(1),
  providerLabel: z.string().min(1),
  providerModel: z.string().min(1),
  summary: z.string().trim().optional().nullable(),
  suggestedModules: z.array(intakeModuleSchema).default([]),
  analysis: z.record(z.unknown()).optional().nullable(),
  reviewReason: z.string().trim().optional().nullable()
});

export const aiIntakeReviewUpdateSchema = z.object({
  selectedModule: intakeModuleSchema,
  draftData: z.record(z.unknown())
});

export const aiIntakeReviewResolveSchema = z.object({
  action: z.enum(["approve", "reject"]),
  selectedModule: intakeModuleSchema.optional(),
  draftData: z.record(z.unknown()).optional()
});

export const aiIntakeReviewSuggestSchema = z.object({
  action: z.literal("suggest"),
  selectedModule: intakeModuleSchema
});

export type AIIntakeReviewStatus = z.infer<typeof aiIntakeReviewStatusSchema>;
export type AIIntakeReviewQueueInput = z.infer<typeof aiIntakeReviewQueueSchema>;
export type AIIntakeReviewUpdateInput = z.infer<typeof aiIntakeReviewUpdateSchema>;
export type AIIntakeReviewResolveInput = z.infer<typeof aiIntakeReviewResolveSchema>;
export type AIIntakeReviewSuggestInput = z.infer<typeof aiIntakeReviewSuggestSchema>;
