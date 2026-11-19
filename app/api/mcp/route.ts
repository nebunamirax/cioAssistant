import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { publicUrl } from "@/lib/auth/session";
import { authenticateToken, businessResponse, businessTokenHash, readBusinessBody } from "@/lib/business/gateway";
import { BusinessError } from "@/lib/business/error";
import { prisma } from "@/lib/db/prisma";
import { createPilotageMcp, toolResponse } from "@/mcp/tools";

function failure(message: string, status: number, code = -32000) {
  const headers = new Headers({ "Cache-Control": "no-store" });
  if (status === 401) headers.set("WWW-Authenticate", 'Bearer realm="CIO Assistant"');
  return Response.json({ jsonrpc: "2.0", id: null, error: { code, message } }, { status, headers });
}

async function handle(request: Request) {
  if (process.env.CIO_MCP_HTTP_ENABLED !== "true") return failure("Le MCP HTTP est désactivé.", 404);
  const origin = request.headers.get("origin");
  if (origin && origin !== publicUrl().origin) return failure("Origine refusée.", 403);

  try {
    const hash = businessTokenHash(request);
    const access = await authenticateToken(prisma, hash);
    const parsedBody = request.method === "POST" ? await readBusinessBody(request) : undefined;
    const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
    const server = createPilotageMcp(
      async (operation, input) => toolResponse(await businessResponse(hash, { operation, input })),
      { write: access.scope === "PILOTAGE" }
    );
    try {
      await server.connect(transport);
      const response = await transport.handleRequest(request, { parsedBody });
      response.headers.set("Cache-Control", "no-store");
      return response;
    } finally {
      await server.close();
    }
  } catch (error) {
    if (error instanceof BusinessError) return failure(error.message, error.status);
    if (error instanceof SyntaxError) return failure("JSON invalide.", 400, -32700);
    return failure("Le service MCP est temporairement indisponible.", 503);
  }
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
