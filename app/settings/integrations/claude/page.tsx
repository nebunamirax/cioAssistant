import Link from "next/link";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
import { requireMember, publicUrl } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { claudeOrigin } from "@/lib/integrations/claude-origin";
import { RevokeToken, TokenForm } from "./token-form";

export default async function ClaudeIntegrationPage() {
  await requireMember("DSI");
  const origin = publicUrl().origin;
  const supported = claudeOrigin(origin);
  const tokens = await prisma.claudeToken.findMany({
    select: { id: true, label: true, createdAt: true, revokedAt: true, user: { select: { name: true } } },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="workspace-page">
      <header className="workspace-page-heading">
        <div>
          <Link className="workspace-panel-link mb-2" href="/settings/integrations"><WorkspaceIcon name="left" className="h-4 w-4" /> Intégrations</Link>
          <h1 className="workspace-page-title">Claude Desktop</h1>
          <p className="mt-2 text-sm text-slate-600">Consultez la roadmap et mettez à jour vos projets depuis Claude.</p>
        </div>
        <a className="button-primary gap-2" href="/api/integrations/claude/extension" download>
          <WorkspaceIcon name="document" className="h-4 w-4" /> Télécharger l’extension .mcpb
        </a>
      </header>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section className="workbench-panel space-y-4">
          <h2 className="panel-title">Installer l’extension</h2>
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
        </section>

        <section className="workbench-panel space-y-4">
          <h2 className="panel-title">Jeton de connexion</h2>
          <TokenForm />
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
                  <span>{token.user.name} · {token.createdAt.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}</span>
                </span>
                {token.revokedAt ? <span className="pilot-status">Révoqué</span> : <RevokeToken id={token.id} />}
              </li>
            ))}
          </ul>
        ) : <p className="workspace-empty">Aucun jeton créé.</p>}
      </section>
    </div>
  );
}
