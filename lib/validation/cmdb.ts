import { z } from "zod";
import { cmdbCriticalities, cmdbEnvironments, cmdbRelationTypes, cmdbStatuses, cmdbTypes } from "@/lib/domain/cmdb";

const optionalText = (max: number) => z.string().trim().max(max).transform((value) => value || null);
const optionalId = optionalText(160);
const filterId = z.string().trim().min(1).max(160).optional().catch(undefined);

const labelKeys = <T extends Record<string, string>>(labels: T) =>
  z.enum(Object.keys(labels) as Array<keyof T & string>);

export const cmdbItemSchema = z.object({
  name: z.string().trim().min(1).max(160),
  reference: optionalText(80).transform((value) => value?.toUpperCase() ?? null),
  type: labelKeys(cmdbTypes),
  status: labelKeys(cmdbStatuses),
  environment: labelKeys(cmdbEnvironments),
  criticality: labelKeys(cmdbCriticalities),
  owner: optionalText(160),
  description: optionalText(5000),
  serviceId: optionalId,
  vendorId: optionalId
});

export const cmdbRelationSchema = z.object({
  sourceId: z.cuid(),
  targetId: z.cuid(),
  type: labelKeys(cmdbRelationTypes)
}).refine(({ sourceId, targetId }) => sourceId !== targetId);

export const cmdbFiltersSchema = z.object({
  q: z.string().trim().max(120).catch("").default(""),
  type: labelKeys(cmdbTypes).optional().catch(undefined),
  status: labelKeys(cmdbStatuses).optional().catch(undefined),
  environment: labelKeys(cmdbEnvironments).optional().catch(undefined),
  criticality: labelKeys(cmdbCriticalities).optional().catch(undefined),
  serviceId: filterId,
  vendorId: filterId
});
