import { describe, expect, it } from "vitest";
import { cmdbFiltersSchema, cmdbItemSchema, cmdbRelationSchema } from "@/lib/validation/cmdb";

describe("CMDB", () => {
  it("treats empty service and vendor filters as unrestricted", () => {
    const filters = cmdbFiltersSchema.parse({ q: "  réseau  ", serviceId: "", vendorId: "", type: "", status: ["ACTIVE", "RETIRED"] });
    expect(filters).toEqual({
      q: "réseau", serviceId: undefined, vendorId: undefined, type: undefined, status: undefined
    });
  });

  it("accepts existing identifiers and normalizes references", () => {
    const item = cmdbItemSchema.parse({
      name: "  ERP  ", reference: "  app-erp  ", type: "APPLICATION",
      status: "ACTIVE", criticality: "CRITICAL", environment: "PRODUCTION",
      description: "", owner: "", serviceId: "", vendorId: "vendor-sap"
    });
    expect(item).toMatchObject({ name: "ERP", reference: "APP-ERP", serviceId: null, vendorId: "vendor-sap" });
  });

  it("rejects self-links and unknown relation types", () => {
    const sourceId = "cm5dyj1lt0000w6t2gv73o363";
    const targetId = "cm5dyj1lt0001w6t2gv73o363";
    expect(cmdbRelationSchema.safeParse({ sourceId, targetId, type: "HOSTED_ON" }).success).toBe(true);
    expect(cmdbRelationSchema.safeParse({ sourceId, targetId: sourceId, type: "HOSTED_ON" }).success).toBe(false);
    expect(cmdbRelationSchema.safeParse({ sourceId, targetId, type: "unknown" }).success).toBe(false);
  });
});
