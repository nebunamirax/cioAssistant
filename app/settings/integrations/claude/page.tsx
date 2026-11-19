import Link from "next/link";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
import { requireMember, publicUrl } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { claudeOrigin } from "@/lib/integrations/claude-origin";
import { pilotageDate } from "@/lib/services/pilotage-service";
import { RevokeToken, TokenForm } from "./token-form";

export default async function ClaudeIntegrationPage() {
  await requireMember("DSI");
  const origin = publicUrl().origin;
  const supported = claudeOrigin(origin);
  const httpEnabled = process.env.CIO_MCP_HTTP_ENABLED === "true";
  const tokens = await prisma.claudeToken.findMany({
    select: { id: true, label: true, scope: true, createdAt: true, expiresAt: true, revokedAt: true, user: { select: { name: true } } },
    orderBy: { createdAt: "desc" }
  });
  const now = new Date();

  return (
    <div className="workspace-page">
      <header className="workspace-page-heading">
        <div>
          <Link className="workspace-panel-link mb-2" href="/settings#integrations-title"><WorkspaceIcon name="left" className="h-4 w-4" /> Toutes les intégrations</Link>
          <h1 className="workspace-page-title">Assistants IA</h1>
          <p className="mt-2 text-sm text-slate-600">Consultez le cockpit et mettez vos fiches à jour depuis un assistant compatible MCP.</p>
        </div>
        <a className="button-primary gap-2" href="/api/integrations/claude/extension" download>
          <WorkspaceIcon name="document" className="h-4 w-4" /> Télécharger l’extension .mcpb
        </a>
      </header>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section className="workbench-panel space-y-4">
          <h2 className="panel-title">Installer l’extension Claude Desktop</h2>
          <ol className="list-decimal space-y-3 pl-5 text-sm text-slate-700">
            <li>Dans Claude Desktop, ouvrez <strong>Paramètres → Application de bureau → Extensions → Gérer → Paramètres avancés</strong>.</li>
            <li>Choisissez <strong>Installer une extension</strong>, puis sélectionnez le fichier <code>cio-assistant.mcpb</code> téléchargé.</li>
            <li>Renseignez l’adresse ci-dessous et le jeton créé sur cette page.</li>
          </ol>
          <label className="field-label">Adresse de CIO Assistant
            <input className="field-input mt-1.5 font-mono" readOnly value={origin} />
          </label>
          {supported?.protocol === "http:" && <p className="text-sm text-slate-600">Cette adresse fonctionne lorsque Claude Desktop et Docker tournent sur le même poste.</p>}
          {supported?.protocol === "https:" && <p className="text-sm text-slate-600">Pour une PKI interne, renseignez également le certificat PEM de l’autorité dans l’extension.</p>}
          {!supported && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Configurez <code>CIO_PUBLIC_URL</code> avec une adresse localhost sur le même poste ou avec l’adresse HTTPS de l’instance partagée.</p>}
          <div className="rounded-lg bg-indigo-50 p-3 text-sm text-slate-700">
            <strong>Premier essai dans Claude</strong>
            <p className="mt-1">« Quels points dois-je traiter en priorité dans CIO Assistant ? Donne-moi les liens vers les fiches. »</p>
          </div>
        </section>

        <section className="workbench-panel space-y-4">
          <h2 className="panel-title">Jeton de connexion</h2>
          <TokenForm />
        </section>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section className="workbench-panel space-y-3">
          <h2 className="panel-title">ChatGPT et clients MCP HTTP</h2>
          {httpEnabled ? <>
            <label className="field-label">Adresse MCP
              <input className="field-input mt-1.5 font-mono" readOnly value={new URL("/api/mcp", origin).href} />
            </label>
            <p className="text-sm text-slate-600">Utilisez un jeton dédié dans l’en-tête <code>Authorization: Bearer</code>. Pour ChatGPT sur un réseau privé, passez par Secure MCP Tunnel.</p>
            <a href="https://developers.openai.com/api/docs/guides/secure-mcp-tunnels" className="workspace-panel-link">Configurer le tunnel ChatGPT</a>
          </> : <p className="text-sm text-slate-600">Activez <code>CIO_MCP_HTTP_ENABLED=true</code> pour connecter un client HTTP.</p>}
        </section>
        <section className="workbench-panel space-y-3">
          <h2 className="panel-title">Espace de travail</h2>
          <p className="text-sm text-slate-600">Les assistants consultent et modifient vos pages avec les mêmes droits et contrôles que vos fiches de pilotage.</p>
          <Link href="/workspace" className="workspace-panel-link">Ouvrir l’espace de travail</Link>
        </section>
      </div>
      <section className="pilot-panel">
        <div className="workspace-panel-heading"><h2>Jetons créés</h2></div>
        {tokens.length ? (
          <ul className="workspace-feed">
            {tokens.map((token) => (
              <li key={token.id} className="workspace-feed-row">
                <span className="workspace-feed-text">
                  <strong>{token.label}</strong>
                  <span>{[token.user.name, token.scope === "PILOTAGE" ? "Lecture et modification" : "Lecture seule",
                    token.expiresAt ? `Expire le ${pilotageDate(token.expiresAt)}` : `Créé le ${pilotageDate(token.createdAt)}`].join(" · ")}</span>
                </span>
                {token.revokedAt ? <span className="pilot-status">Révoqué</span> :
                  token.expiresAt && token.expiresAt <= now ? <span className="pilot-status">Expiré</span> : <RevokeToken id={token.id} />}
              </li>
            ))}
          </ul>
        ) : <p className="workspace-empty">Aucun jeton créé.</p>}
      </section>
    </div>
  );
}
