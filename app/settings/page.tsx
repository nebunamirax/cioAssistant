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
        <Link href="/settings/integrations" className="button-secondary">Intégrations Planner et ticketing</Link>
      </section>
      <SettingsForm initialSettings={settings} />
    </div>
  );
}
