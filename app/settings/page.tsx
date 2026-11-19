import Link from "next/link";
import { SettingsForm } from "@/components/settings/settings-form";
import { getAIConfiguration } from "@/lib/ai/config";
import { getOutlookConnectionStatus } from "@/lib/integrations/outlook";
import { plannerConnection } from "@/lib/integrations/planner";
import { loadAppSettingsSync } from "@/lib/settings/service";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = loadAppSettingsSync();
  const ai = getAIConfiguration(settings);
  const outlook = getOutlookConnectionStatus();
  const planner = await plannerConnection();
  const notion = settings.integrations.notionEnabled;
  const notionConfigured = Boolean(settings.integrations.notionApiKey.trim() && settings.integrations.notionDatabaseId.trim());
  const integrations = [
    { title: "Assistants IA", status: process.env.CIO_MCP_HTTP_ENABLED === "true" ? "MCP HTTP activé" : "Extension Claude Desktop", action: "Gérer les accès MCP", href: "/settings/integrations/claude" },
    { title: "Planner et tickets", status: planner.connected ? "Planner connecté" : planner.configured ? "Prêt à connecter" : "Planner à configurer", action: planner.connected ? "Gérer les sources" : "Configurer les sources", href: "/settings/integrations" },
    { title: "Outlook", status: !outlook.enabled ? "Désactivé" : outlook.connected ? "Connecté" : outlook.configured ? "Prêt à connecter" : "À configurer", action: outlook.enabled && outlook.configured ? "Ouvrir les e-mails" : "Configurer Outlook", href: outlook.enabled && outlook.configured ? "/emails" : "#outlook-settings" },
    { title: "Notion", status: !notion ? "Désactivé" : notionConfigured ? "Configuré" : "À configurer", action: notion && notionConfigured ? "Tester Notion" : "Configurer Notion", href: "#notion-settings" }
  ];

  return (
    <div className="workspace-page">
      <header className="workspace-page-heading">
        <h1 className="workspace-page-title">Paramètres</h1>
      </header>
      <nav aria-labelledby="integrations-title" className="workbench-panel space-y-3">
        <h2 id="integrations-title" className="panel-title">Intégrations</h2>
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {integrations.map(({ title, status, action, href }) => <li key={title} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <strong className="block text-sm">{title}</strong>
            <p className="mb-2 text-xs text-slate-600">{status}</p>
            <Link href={href} className="workspace-panel-link">{action}</Link>
          </li>)}
        </ul>
      </nav>
      <SettingsForm initialSettings={settings} activeModel={ai.activeModel} activeProvider={ai.providerMode} />
    </div>
  );
}
