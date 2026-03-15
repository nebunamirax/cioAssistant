import { ACTION_STATUSES, PRIORITIES } from "@/lib/domain/constants";
import { z } from "zod";

export const actionSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  status: z.enum(ACTION_STATUSES).default("TODO"),
  priority: z.enum(PRIORITIES).default("NORMAL"),
  dueDate: z.string().datetime().optional().nullable(),
  projectId: z.string().optional().nullable(),
  contractId: z.string().optional().nullable(),
  vendorId: z.string().optional().nullable(),
  sourceType: z.string().optional().nullable(),
  sourceRef: z.string().optional().nullable()
});

export type ActionInput = z.infer<typeof actionSchema>;
