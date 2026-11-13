import { readFile } from "node:fs/promises";
import { currentMember } from "@/lib/auth/session";

export async function GET() {
  if ((await currentMember())?.role !== "DSI") return new Response(null, { status: 403 });
  const file = await readFile("dist/cio-assistant.mcpb").catch(() => null);
  if (!file) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(file), {
    headers: { "Content-Type": "application/zip", "Content-Disposition": "attachment; filename=cio-assistant.mcpb" }
  });
}
