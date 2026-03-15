import { describe, expect, it } from "vitest";
import { projectSchema } from "@/lib/validation/project";

describe("projectSchema", () => {
  it("applique les valeurs par defaut", () => {
    const result = projectSchema.parse({
      title: "Migration ERP",
      type: "MIGRATION"
    });

    expect(result.status).toBe("DRAFT");
    expect(result.priority).toBe("NORMAL");
  });

  it("rejette un type invalide", () => {
    expect(() =>
      projectSchema.parse({
        title: "Projet invalide",
        type: "INVALID"
      })
    ).toThrow();
  });
});
