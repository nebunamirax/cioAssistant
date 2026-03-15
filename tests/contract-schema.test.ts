import { describe, expect, it } from "vitest";
import { contractSchema } from "@/lib/validation/contract";

describe("contractSchema", () => {
  it("applique les valeurs par defaut", () => {
    const result = contractSchema.parse({
      vendorId: "v1",
      title: "Infogerance 2026"
    });

    expect(result.status).toBe("DRAFT");
    expect(result.renewalType).toBe("NONE");
  });

  it("rejette un statut invalide", () => {
    expect(() =>
      contractSchema.parse({
        vendorId: "v1",
        title: "Contrat invalide",
        status: "INVALID"
      })
    ).toThrow();
  });
});
