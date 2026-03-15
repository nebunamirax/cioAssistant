import { z } from "zod";

export const aiIntakeSchema = z.object({
  text: z.string().trim().min(10),
  sourceName: z.string().trim().optional().nullable()
});

export type AIIntakeInput = z.infer<typeof aiIntakeSchema>;
