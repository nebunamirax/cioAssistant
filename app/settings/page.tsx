import { SettingsForm } from "@/components/settings/settings-form";
import { loadAppSettingsSync } from "@/lib/settings/service";

export default function SettingsPage() {
  const settings = loadAppSettingsSync();

  return (
    <div className="space-y-4">
      <section className="workbench-header">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Paramètres</p>
          <h1 className="text-2xl font-semibold text-slate-950">Configuration unifiée</h1>
          <p className="text-sm text-slate-600">
            Toute la configuration applicative est regroupée ici: IA, modèles, providers locaux, OpenAI, Outlook et Notion.
          </p>
        </div>
      </section>
      <SettingsForm initialSettings={settings} />
    </div>
  );
}
