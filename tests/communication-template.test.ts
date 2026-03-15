import { describe, expect, it } from "vitest";
import { renderCommunicationTemplate } from "@/lib/communications/templates";

describe("communication templates", () => {
  it("genere un post mortem a partir des inputs", () => {
    const result = renderCommunicationTemplate("POST_MORTEM", {
      incidentTitle: "Panne VPN",
      incidentDate: "2026-03-15",
      summary: "Incident de connectivite pour les utilisateurs nomades",
      impact: "Connexion impossible\nRetard du support",
      rootCause: "Certificat expire",
      actions: "Renouveler le certificat\nAutomatiser les alertes",
      lessonsLearned: "Mieux superviser les dates d'expiration"
    });

    expect(result.title).toContain("Panne VPN");
    expect(result.contentMarkdown).toContain("## Cause racine");
    expect(result.contentMarkdown).toContain("Renouveler le certificat");
  });
});
