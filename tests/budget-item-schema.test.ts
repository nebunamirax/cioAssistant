import { describe, expect, it } from "vitest";
import { budgetItemSchema } from "@/lib/validation/budget-item";

describe("budgetItemSchema", () => {
  it("accepte une ligne minimale", () => {
    const result = budgetItemSchema.parse({
      title: "Licences 2026"
    });

    expect(result.title).toBe("Licences 2026");
    expect(result.fiscalYear).toBeUndefined();
  });

  it("rejette un exercice invalide", () => {
    expect(() =>
      budgetItemSchema.parse({
        title: "Budget invalide",
        fiscalYear: 1900
      })
    ).toThrow();
  });
});
