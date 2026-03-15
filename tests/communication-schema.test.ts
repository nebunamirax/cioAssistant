import { describe, expect, it } from "vitest";
import { communicationSchema } from "@/lib/validation/communication";

describe("communicationSchema", () => {
  it("applique le statut par defaut", () => {
    const result = communicationSchema.parse({
      title: "Compte rendu pilotage"
    });

    expect(result.status).toBe("DRAFT");
  });

  it("accepte un template et ses inputs", () => {
    const result = communicationSchema.parse({
      title: "Post mortem VPN",
      templateKey: "POST_MORTEM",
      templateInputData: {
        incidentTitle: "Panne VPN"
      }
    });

    expect(result.templateKey).toBe("POST_MORTEM");
    expect(result.templateInputData?.incidentTitle).toBe("Panne VPN");
  });

  it("rejette un statut invalide", () => {
    expect(() =>
      communicationSchema.parse({
        title: "Communication invalide",
        status: "INVALID"
      })
    ).toThrow();
  });
});
