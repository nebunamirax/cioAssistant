import { ActionStatus, Priority } from "@prisma/client";
import { z } from "zod";

export const actionSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  status: z.nativeEnum(ActionStatus).default(ActionStatus.TODO),
  priority: z.nativeEnum(Priority).default(Priority.NORMAL),
  dueDate: z.string().datetime().optional().nullable(),
  projectId: z.string().optional().nullable(),
  contractId: z.string().optional().nullable(),
  vendorId: z.string().optional().nullable(),
  sourceType: z.string().optional().nullable(),
  sourceRef: z.string().optional().nullable()
});

export type ActionInput = z.infer<typeof actionSchema>;
