import { describe, expect, it } from "vitest";
import { actionSchema } from "@/lib/validation/action";

describe("actionSchema", () => {
  it("applique les valeurs par defaut", () => {
    const result = actionSchema.parse({
      title: "Initialiser le MVP"
    });

    expect(result.status).toBe("TODO");
    expect(result.priority).toBe("NORMAL");
  });

  it("rejette un statut invalide", () => {
    expect(() =>
      actionSchema.parse({
        title: "Action invalide",
        status: "INVALID"
      })
    ).toThrow();
  });
});
