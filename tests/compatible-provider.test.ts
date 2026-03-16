import { afterEach, describe, expect, it, vi } from "vitest";

import { CompatibleAIProvider } from "@/lib/ai/providers/compatible-provider";

describe("compatible-provider", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("analyse l'intake sans response_format et parse un JSON entoure de texte", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: `Voici le resultat:
{
  "summary": "Demande budget detectee",
  "primaryModule": "budget",
  "routingConfidence": 0.91,
  "reviewRecommended": false,
  "toolCalls": [
    { "tool": "create_budget_item", "args": { "title": "Budget cloud 2026", "plannedAmount": 120000, "fiscalYear": 2026 } },
    { "tool": "create_action", "args": { "title": "Valider le budget 2026" } }
  ]
}`
            }
          }
        ]
      })
    }));

    vi.stubGlobal("fetch", fetchMock);

    const provider = new CompatibleAIProvider("http://example.test/v1", "mistralai/devstral-small-2507");
    const result = await provider.analyzeIntake({ text: "Budget cloud 2026: 120000 EUR" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://example.test/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        body: expect.any(String)
      })
    );

    const request = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(request.response_format).toBeUndefined();
    expect(result).toEqual(
      expect.objectContaining({
        summary: "Demande budget detectee",
        primaryModule: "budget"
      })
    );
    expect(result.toolCalls).toHaveLength(2);
    expect(result.toolCalls[0]?.tool).toBe("create_budget_item");
    expect(result.toolCalls[1]?.tool).toBe("create_action");
  });

  it("remonte le corps de reponse en cas d'erreur HTTP", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 400,
        text: async () => '{"error":"unsupported field: response_format"}'
      }))
    );

    const provider = new CompatibleAIProvider("http://example.test/v1", "mistralai/devstral-small-2507");

    await expect(provider.analyzeIntake({ text: "test" })).rejects.toThrow(
      'Compatible provider error 400: {"error":"unsupported field: response_format"}'
    );
  });

  it("normalise une reponse partielle sans summary et avec dueDate vide", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  primaryModule: "actions",
                  routingConfidence: 0.88,
                  reviewRecommended: false,
                  toolCalls: [{ tool: "create_action", args: { title: "test", dueDate: "" } }]
                })
              }
            }
          ]
        })
      }))
    );

    const provider = new CompatibleAIProvider("http://example.test/v1", "mistralai/devstral-small-2507");
    const result = await provider.analyzeIntake({ text: "ajoute une action nommee test" });

    expect(result.summary).toContain("ajoute une action nommee test");
    expect(result.toolCalls).toEqual([{ tool: "create_action", args: { title: "test", dueDate: undefined } }]);
  });

  it("deduit une echeance a partir d'une date naturelle francaise meme si le modele oublie le champ date", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: "Demande de support poste de travail",
                  primaryModule: "actions",
                  routingConfidence: 0.84,
                  reviewRecommended: false,
                  toolCalls: [{ tool: "create_action", args: { title: "Task RAM upgrade" } }]
                })
              }
            }
          ]
        })
      }))
    );

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T10:00:00.000Z"));

    const provider = new CompatibleAIProvider("http://example.test/v1", "mistralai/devstral-small-2507");
    const result = await provider.analyzeIntake({
      text: `Hello Max,

Tu pourrais traiter d'ici d'ici le 27 juillet l'ajout de ram sur mon pc ?

Par avance merci.`
    });

    expect(result.toolCalls[0]?.tool).toBe("create_action");
    if (result.toolCalls[0]?.tool !== "create_action") {
      throw new Error("Expected action tool call");
    }
    expect(result.toolCalls[0].args.title).toBe("Task RAM upgrade");
    expect(result.toolCalls[0].args.dueDate).toBe("2026-07-27T09:00:00.000Z");

  });

  it("suggere un brouillon d'action cible et y injecte la date explicite", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: "Changer le PC de Max",
                  description: "Remplacer le poste de travail de Max.",
                  dueDate: ""
                })
              }
            }
          ]
        })
      }))
    );

    const provider = new CompatibleAIProvider("http://example.test/v1", "mistralai/devstral-small-2507");
    const result = await provider.suggestDraft("actions", {
      text: "Hello Max, tu peux me changer mon pc pour le 28/07/2026 stp ?"
    });

    expect(result).toEqual({
      title: "Changer le PC de Max",
      description: "Remplacer le poste de travail de Max.",
      dueDate: "2026-07-28T09:00:00.000Z"
    });
  });

  it("normalise un projet exploitable meme si le modele oublie primaryModule et le type", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: "Projet de deploiement telephonie",
                  primaryModule: "",
                  routingConfidence: 0.89,
                  reviewRecommended: false,
                  toolCalls: [
                    {
                      tool: "create_project",
                      args: {
                        title: "Deploiement telephonie"
                      }
                    }
                  ]
                })
              }
            }
          ]
        })
      }))
    );

    const provider = new CompatibleAIProvider("http://example.test/v1", "mistralai/devstral-small-2507");
    const result = await provider.analyzeIntake({
      text: "ajoute un projet de type deploiement telephonie qui commence le 12/01/2026 et termine le 15/05/2026."
    });

    expect(result.primaryModule).toBe("projects");
    expect(result.toolCalls[0]).toEqual({
      tool: "create_project",
      args: {
        title: "Deploiement telephonie",
        type: "DEPLOYMENT",
        startDate: "2026-01-12T09:00:00.000Z",
        targetDate: "2026-05-15T09:00:00.000Z"
      }
    });
  });
});
