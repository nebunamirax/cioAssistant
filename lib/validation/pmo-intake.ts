import { z } from "zod";

export const pmoLineLimit = 100;
export const pmoTextLimit = 18000;

const id = z.string().min(1).max(250);

export const pmoIntakeSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("preview"),
    text: z.string().trim().min(10).max(pmoTextLimit).refine((text) => text.split(/\r?\n/).filter((line) => line.trim()).length <= pmoLineLimit),
    sourceName: z.string().trim().max(160).optional(),
    projectId: id.optional()
  }).strict(),
  z.object({
    mode: z.literal("apply"),
    importId: id,
    selected: z.array(id).min(1).max(pmoLineLimit)
  }).strict()
]);

export type PmoPreviewInput = Extract<z.infer<typeof pmoIntakeSchema>, { mode: "preview" }>;
