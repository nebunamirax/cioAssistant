import { z } from "zod";

const monthPattern = /^\d{4}-(?:0[1-9]|1[0-2])$/;
export const reportFields = z.object({ month: z.string().regex(monthPattern), comment: z.string().max(2400).optional() }).strict();
