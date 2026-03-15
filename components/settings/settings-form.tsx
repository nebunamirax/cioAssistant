"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AppSettings } from "@/lib/settings/schema";

type SettingsFormProps = {
  initialSettings: AppSettings;
};

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateAIField = (field: keyof AppSettings["ai"], value: string) => {
    setSettings((current) => ({
      ...current,
      ai: {
        ...current.ai,
        [field]: value
      }
    }));
  };

  const updateIntegrationField = (field: keyof AppSettings["integrations"], value: string | boolean) => {
    setSettings((current) => ({
      ...current,
      integrations: {
        ...current.integrations,
        [field]: value
      }
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Impossible d'enregistrer les paramètres.");
      setLoading(false);
      return;
    }

    setSettings(payload.data);
    setLoading(false);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <section className="workbench-panel space-y-4">
        <div>
          <h2 className="panel-title">IA</h2>
          <p className="panel-caption">Choisis le provider actif et modifie directement les modèles ou clés utilisés par l’application.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label>
            <span className="field-label">Provider actif</span>
            <select
              value={settings.ai.providerMode}
              onChange={(event) => updateAIField("providerMode", event.target.value)}
              className="field-select"
            >
              <option value="local">Local</option>
              <option value="openai">OpenAI</option>
              <option value="compatible">OpenAI-compatible</option>
            </select>
          </label>
          <label>
            <span className="field-label">Modèle local actif</span>
            <input
              value={settings.ai.localModel}
              onChange={(event) => updateAIField("localModel", event.target.value)}
              className="field-input"
              placeholder="heuristic-v1"
            />
          </label>
          <label className="md:col-span-2">
            <span className="field-label">Catalogue modèles locaux</span>
            <input
              value={settings.ai.localModels}
              onChange={(event) => updateAIField("localModels", event.target.value)}
              className="field-input"
              placeholder="heuristic-v1,llama3.1:8b,qwen2.5:14b"
            />
          </label>
        </div>

        <div className="form-section space-y-3">
          <h3 className="form-section-title">OpenAI</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="md:col-span-2">
              <span className="field-label">API key</span>
              <input
                value={settings.ai.openAIApiKey}
                onChange={(event) => updateAIField("openAIApiKey", event.target.value)}
                className="field-input"
                placeholder="sk-..."
              />
            </label>
            <label>
              <span className="field-label">Modèle actif</span>
              <input
                value={settings.ai.openAIModel}
                onChange={(event) => updateAIField("openAIModel", event.target.value)}
                className="field-input"
                placeholder="gpt-4.1"
              />
            </label>
            <label>
              <span className="field-label">Catalogue modèles</span>
              <input
                value={settings.ai.openAIModels}
                onChange={(event) => updateAIField("openAIModels", event.target.value)}
                className="field-input"
                placeholder="gpt-4.1,gpt-4.1-mini"
              />
            </label>
          </div>
        </div>

        <div className="form-section space-y-3">
          <h3 className="form-section-title">OpenAI-compatible</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="md:col-span-2">
              <span className="field-label">Base URL</span>
              <input
                value={settings.ai.compatibleBaseUrl}
                onChange={(event) => updateAIField("compatibleBaseUrl", event.target.value)}
                className="field-input"
                placeholder="http://host.docker.internal:11434/v1"
              />
            </label>
            <label className="md:col-span-2">
              <span className="field-label">API key</span>
              <input
                value={settings.ai.compatibleApiKey}
                onChange={(event) => updateAIField("compatibleApiKey", event.target.value)}
                className="field-input"
                placeholder="optionnel"
              />
            </label>
            <label>
              <span className="field-label">Modèle actif</span>
              <input
                value={settings.ai.compatibleModel}
                onChange={(event) => updateAIField("compatibleModel", event.target.value)}
                className="field-input"
                placeholder="llama3.1:8b"
              />
            </label>
            <label>
              <span className="field-label">Catalogue modèles</span>
              <input
                value={settings.ai.compatibleModels}
                onChange={(event) => updateAIField("compatibleModels", event.target.value)}
                className="field-input"
                placeholder="llama3.1:8b,qwen2.5:14b"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="workbench-panel space-y-4">
        <div>
          <h2 className="panel-title">Intégrations</h2>
          <p className="panel-caption">Même menu, mêmes règles: Outlook et Notion se configurent ici.</p>
        </div>

        <div className="form-section space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="form-section-title">Outlook</h3>
              <p className="form-section-caption">Prépare la connexion Microsoft Graph.</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={settings.integrations.outlookEnabled}
                onChange={(event) => updateIntegrationField("outlookEnabled", event.target.checked)}
              />
              Activé
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label>
              <span className="field-label">Tenant ID</span>
              <input
                value={settings.integrations.outlookTenantId}
                onChange={(event) => updateIntegrationField("outlookTenantId", event.target.value)}
                className="field-input"
              />
            </label>
            <label>
              <span className="field-label">Client ID</span>
              <input
                value={settings.integrations.outlookClientId}
                onChange={(event) => updateIntegrationField("outlookClientId", event.target.value)}
                className="field-input"
              />
            </label>
          </div>
        </div>

        <div className="form-section space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="form-section-title">Notion</h3>
              <p className="form-section-caption">Prépare la connexion et la base de travail Notion.</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={settings.integrations.notionEnabled}
                onChange={(event) => updateIntegrationField("notionEnabled", event.target.checked)}
              />
              Activé
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label>
              <span className="field-label">API key</span>
              <input
                value={settings.integrations.notionApiKey}
                onChange={(event) => updateIntegrationField("notionApiKey", event.target.value)}
                className="field-input"
              />
            </label>
            <label>
              <span className="field-label">Database ID</span>
              <input
                value={settings.integrations.notionDatabaseId}
                onChange={(event) => updateIntegrationField("notionDatabaseId", event.target.value)}
                className="field-input"
              />
            </label>
          </div>
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex justify-end">
        <button disabled={loading} className="button-primary">
          {loading ? "Enregistrement..." : "Enregistrer les paramètres"}
        </button>
      </div>
    </form>
  );
}
