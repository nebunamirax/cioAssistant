import { COMMUNICATION_STATUSES } from "@/lib/domain/constants";
import { COMMUNICATION_TEMPLATE_KEYS } from "@/lib/communications/templates";
import { z } from "zod";

const communicationBaseSchema = z.object({
  title: z.string(),
  type: z.string().optional().nullable(),
  status: z.enum(COMMUNICATION_STATUSES).default("DRAFT"),
  templateKey: z.enum(COMMUNICATION_TEMPLATE_KEYS).optional().nullable(),
  templateInputData: z.record(z.string()).optional().nullable(),
  contentText: z.string().optional().nullable(),
  contentMarkdown: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  actionId: z.string().optional().nullable(),
  contractId: z.string().optional().nullable()
});

export const communicationSchema = communicationBaseSchema.superRefine((value, ctx) => {
  if (value.title.trim().length >= 3) {
    return;
  }

  if (value.templateKey) {
    return;
  }

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: ["title"],
    message: "String must contain at least 3 character(s)"
  });
});

export const communicationUpdateSchema = communicationBaseSchema.partial().extend({
  title: z.string().min(3).optional()
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided"
});

export const communicationFilterSchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(COMMUNICATION_STATUSES).optional(),
  type: z.string().trim().optional(),
  projectId: z.string().optional(),
  actionId: z.string().optional(),
  contractId: z.string().optional()
});

export type CommunicationInput = z.infer<typeof communicationSchema>;
export type CommunicationUpdateInput = z.infer<typeof communicationUpdateSchema>;
export type CommunicationFilters = z.infer<typeof communicationFilterSchema>;
