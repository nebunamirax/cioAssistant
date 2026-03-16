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
            Toute la configuration applicative est regroupée ici: IA, OpenAI, providers OpenAI-compatible, Outlook et Notion.
          </p>
          <p className="text-sm text-slate-500">
            Valeur par défaut appliquée: LM Studio via `http://host.docker.internal:1234/v1` avec le modèle `mistralai/devstral-small-2507`.
          </p>
        </div>
      </section>
      <SettingsForm initialSettings={settings} />
    </div>
  );
}
