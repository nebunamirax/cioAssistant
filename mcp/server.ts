import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { claudeOrigin } from "../lib/integrations/claude-origin";
import manifest from "./manifest.json";
import { createPilotageMcp, toolResponse } from "./tools";

const url = claudeOrigin(process.env.CIO_URL || manifest.user_config.cio_url.default);
if (!url) {
  throw new Error("Saisissez l’origine de CIO Assistant. Utilisez http://localhost:3000 sur le même poste ou l’URL HTTPS de l’instance partagée.");
}
const token = process.env.CIO_TOKEN;
if (!token || !/^cio_[A-Za-z0-9_-]{43}$/.test(token)) throw new Error("Jeton CIO Assistant invalide.");
const endpoint = new URL("/api/v1/business", url);

async function call(operation: string, input: object) {
  try {
    const response = await fetch(endpoint, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(25000),
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ operation, input })
    });
    return await toolResponse(response);
  } catch {
    const detail = endpoint.protocol === "http:"
      ? "Vérifiez que Docker est démarré et que l’application répond à cette adresse."
      : "Vérifiez le réseau privé et le certificat HTTPS de l’instance.";
    return { content: [{ type: "text" as const, text: JSON.stringify({ error: `CIO Assistant est inaccessible à ${endpoint.origin}. ${detail}` }) }], isError: true };
  }
}

const server = createPilotageMcp(call);
server.connect(new StdioServerTransport()).catch((error) => {
  console.error(error instanceof Error ? error.message : "Démarrage MCP impossible.");
  process.exitCode = 1;
});
