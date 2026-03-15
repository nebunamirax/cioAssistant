import { describe, expect, it } from "vitest";
import { vendorSchema } from "@/lib/validation/vendor";

describe("vendorSchema", () => {
  it("normalise un email vide en null", () => {
    const result = vendorSchema.parse({
      name: "Acme",
      mainContactEmail: ""
    });

    expect(result.mainContactEmail).toBeNull();
  });

  it("rejette un email invalide", () => {
    expect(() =>
      vendorSchema.parse({
        name: "Acme",
        mainContactEmail: "invalid"
      })
    ).toThrow();
  });
});
