import Link from "next/link";
import { SettingsForm } from "@/components/settings/settings-form";
import { loadAppSettingsSync } from "@/lib/settings/service";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const settings = loadAppSettingsSync();

  return (
    <div className="space-y-4">
      <section className="workbench-header">
        <h1 className="text-2xl font-semibold">Paramètres</h1>
      </section>
      <nav aria-labelledby="integrations-title" className="workbench-panel space-y-3">
        <h2 id="integrations-title" className="panel-title">Intégrations</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/settings/integrations/claude" className="button-primary">Assistants IA</Link>
          <Link href="/settings/integrations" className="button-secondary">Planner et tickets</Link>
          <Link href="#outlook-settings" className="button-secondary">Outlook</Link>
          <Link href="#notion-settings" className="button-secondary">Notion</Link>
        </div>
      </nav>
      <SettingsForm initialSettings={settings} />
    </div>
  );
}
