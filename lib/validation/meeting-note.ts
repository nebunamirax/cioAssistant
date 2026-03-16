import { z } from "zod";

const stringListSchema = z.array(z.string().trim().min(1));
const meetingActionDraftSchema = z.object({
  title: z.string().trim().min(3),
  ownerName: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
  createdActionId: z.string().optional().nullable()
});

export const meetingNoteSchema = z.object({
  projectId: z.string().optional().nullable(),
  title: z.string().trim().min(3),
  meetingDate: z.string().datetime(),
  attendees: stringListSchema.default([]),
  rawContent: z.string().trim().min(1),
  summary: z.string().optional().nullable(),
  extractedActions: z.array(meetingActionDraftSchema).default([]),
  extractedDecisions: stringListSchema.default([]),
  extractedRisks: stringListSchema.default([]),
  extractedDeadlines: stringListSchema.default([])
});

export const meetingNoteUpdateSchema = meetingNoteSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided"
});

export const meetingNoteFilterSchema = z.object({
  search: z.string().trim().optional(),
  projectId: z.string().trim().optional()
});

export type MeetingNoteInput = z.infer<typeof meetingNoteSchema>;
export type MeetingNoteUpdateInput = z.infer<typeof meetingNoteUpdateSchema>;
export type MeetingNoteFilters = z.infer<typeof meetingNoteFilterSchema>;
export type MeetingActionDraftInput = z.infer<typeof meetingActionDraftSchema>;
