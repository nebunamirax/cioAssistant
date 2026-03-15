import { z } from "zod";

const vendorBaseSchema = z.object({
  name: z.string().min(2),
  category: z.string().optional().nullable(),
  mainContactName: z.string().optional().nullable(),
  mainContactEmail: z.union([z.string().email(), z.literal(""), z.null()]).optional(),
  notes: z.string().optional().nullable()
});

export const vendorSchema = vendorBaseSchema.transform((value) => ({
  ...value,
  mainContactEmail: value.mainContactEmail === "" ? null : value.mainContactEmail
}));

export const vendorUpdateSchema = vendorBaseSchema.partial().extend({
  name: z.string().min(2).optional()
}).transform((value) => ({
  ...value,
  ...(value.mainContactEmail === "" ? { mainContactEmail: null } : {})
})).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided"
});

export const vendorFilterSchema = z.object({
  search: z.string().trim().optional(),
  category: z.string().trim().optional()
});

export type VendorInput = z.infer<typeof vendorSchema>;
export type VendorUpdateInput = z.infer<typeof vendorUpdateSchema>;
export type VendorFilters = z.infer<typeof vendorFilterSchema>;
