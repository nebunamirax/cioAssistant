import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { entities, getFields, idField, keyField, meetingBatch, reviewFields, searchFields } from "../lib/business/contracts";

const url = new URL(process.env.CIO_URL ?? "");
if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
  throw new Error("CIO_URL doit être l’origine HTTPS de CIO Assistant.");
}
const token = process.env.CIO_TOKEN;
if (!token || !/^cio_[A-Za-z0-9_-]{43}$/.test(token)) throw new Error("Jeton CIO Assistant invalide.");

const server = new McpServer({ name: "cio-assistant", version: "1.0.0" }, {
  instructions: "Utilisez les outils d’écriture lorsque l’utilisateur demande explicitement l’enregistrement. Pour un compte rendu et ses fiches liées, utilisez enregistrer_compte_rendu. Gardez la même clé pour rejouer un appel. En cas d’ambiguïté, demandez à l’utilisateur de choisir parmi les candidats avant d’écrire."
});

async function call(operation: string, input: object) {
  try {
    const response = await fetch(new URL("/api/v1/business", url), {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(25000),
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ operation, input })
    });
    const result = await response.json();
    return { content: [{ type: "text" as const, text: JSON.stringify(result) }], isError: !response.ok };
  } catch {
    return { content: [{ type: "text" as const, text: "CIO Assistant est inaccessible. Vérifiez le réseau privé, l’URL et la chaîne de confiance HTTPS." }], isError: true };
  }
}

server.registerTool("rechercher_fiches", {
  description: "Cherche les fiches et leurs identifiants, y compris les membres pour une affectation. Utilisez nextCursor pour la suite.",
  inputSchema: searchFields, annotations: { readOnlyHint: true, openWorldHint: false }
}, (args) => call("search", args));

server.registerTool("consulter_fiche", {
  description: "Consulte une fiche CIO Assistant par identifiant.",
  inputSchema: getFields, annotations: { readOnlyHint: true, openWorldHint: false }
}, (args) => call("get", args));

const labels = {
  objective: "objectif", project: "projet", milestone: "jalon", action: "action", service: "service", control: "controle",
  risk: "risque", decision: "decision", vendor: "prestataire", contract: "contrat", budget: "ligne_budgetaire", meeting: "reunion",
  communication: "communication", report: "brouillon_direction"
};
for (const entity of Object.keys(entities) as (keyof typeof entities)[]) {
  const fields: z.AnyZodObject = entities[entity];
  const base = { key: keyField };
  server.registerTool(`creer_${labels[entity]}`, {
    description: `Enregistre une fiche de type ${labels[entity]} dans CIO Assistant.`,
    inputSchema: z.object({ ...base, fields }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, (args) => call("create", { entity, ...args }));
  server.registerTool(`modifier_${labels[entity]}`, {
    description: entity === "control" ? "Enregistre une correction complète en conservant le contrôle original." : `Met à jour les champs fournis de la fiche ${labels[entity]}.`,
    inputSchema: z.object({ ...base, id: idField, fields: entity === "control" ? fields : fields.partial() }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, (args) => call("update", { entity, ...args }));
}

server.registerTool("enregistrer_compte_rendu", {
  description: "Enregistre la note, les actions, les risques et les décisions liés dans une seule transaction.",
  inputSchema: meetingBatch,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
}, (args) => call("meeting_batch", args));

server.registerTool("lire_revue_hebdomadaire", {
  description: "Consulte les points de la revue hebdomadaire et les motifs d’attention.",
  inputSchema: reviewFields, annotations: { readOnlyHint: true, openWorldHint: false }
}, (args) => call("weekly_review", args));

server.registerTool("lire_synthese_externe", {
  description: "Consulte les tâches et tickets externes nécessitant une attention.",
  inputSchema: z.object({ limit: z.number().int().min(1).max(100).optional() }),
  annotations: { readOnlyHint: true, openWorldHint: false }
}, (args) => call("external_summary", args));

server.connect(new StdioServerTransport()).catch((error) => {
  console.error(error instanceof Error ? error.message : "Démarrage MCP impossible.");
  process.exitCode = 1;
});
