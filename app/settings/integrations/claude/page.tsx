import Link from "next/link";
import { requireMember, publicUrl } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { RevokeToken, TokenForm } from "./token-form";

export default async function ClaudeIntegrationPage() {
  await requireMember("DSI");
  const tokens = await prisma.claudeToken.findMany({
    select: { id: true, label: true, createdAt: true, revokedAt: true, user: { select: { name: true } } },
    orderBy: { createdAt: "desc" }
  });
  return <div className="space-y-4">
    <header className="workbench-header"><div><Link className="pilot-row-link" href="/settings/integrations">Intégrations</Link><h1 className="text-2xl font-semibold">Claude Desktop</h1></div></header>
    <section className="workbench-panel space-y-4">
      <p>Installez l’extension dans Claude Desktop et renseignez l’URL privée HTTPS de CIO Assistant ainsi que le jeton.</p>
      <p>URL de l’instance <code>{publicUrl().origin}</code></p>
      <a className="button-secondary inline-block" href="/api/integrations/claude/extension" download>Télécharger l’extension .mcpb</a>
      <TokenForm />
    </section>
    <section className="workbench-panel space-y-3">
      <h2 className="panel-title">Jetons</h2>
      {tokens.map((token) => <div className="flex items-center justify-between border-t pt-2" key={token.id}>
        <span>{token.label} · {token.user.name} · {token.createdAt.toLocaleDateString("fr-FR")}</span>
        {token.revokedAt ? <span>Révoqué</span> : <RevokeToken id={token.id} />}
      </div>)}
    </section>
  </div>;
}
