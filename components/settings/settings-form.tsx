"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AppSettings } from "@/lib/settings/schema";

type SettingsFormProps = {
  initialSettings: AppSettings;
};

function getStatusTone(status?: "success" | "warning" | "error") {
  if (status === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "error") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (status === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-500";
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings>({
    ...initialSettings,
    ai: {
      ...initialSettings.ai,
      providerMode: initialSettings.ai.providerMode === "local" ? "compatible" : initialSettings.ai.providerMode
    }
  });
  const [loading, setLoading] = useState(false);
  const [testingScope, setTestingScope] = useState<"ai" | "outlook" | "notion" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Partial<Record<
      "ai" | "outlook" | "notion",
      {
        status: "success" | "warning" | "error";
        title: string;
        message: string;
        details?: string[];
      }
    >>
  >({});

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

  const runTest = async (scope: "ai" | "outlook" | "notion") => {
    setTestingScope(scope);
    setError(null);

    const response = await fetch("/api/settings/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope,
        settings
      })
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Impossible de tester la configuration.");
      setTestingScope(null);
      return;
    }

    const item = payload.data.results[0];
    setTestResults((current) => ({
      ...current,
      [scope]: item
    }));
    setTestingScope(null);
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <section className="workbench-panel space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="panel-title">IA</h2>
            <p className="panel-caption">Choisis le provider actif et modifie directement les modèles ou clés utilisés par l’application.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusTone(testResults.ai?.status)}`}>
              {testResults.ai ? `${testResults.ai.status}: ${testResults.ai.title}` : "Non testé"}
            </span>
            <button
              type="button"
              disabled={testingScope !== null}
              onClick={() => runTest("ai")}
              className="button-secondary"
            >
              {testingScope === "ai" ? "Test IA..." : "Tester l'IA"}
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label>
            <span className="field-label">Provider actif</span>
            <select
              value={settings.ai.providerMode}
              onChange={(event) => updateAIField("providerMode", event.target.value)}
              className="field-select"
            >
              <option value="openai">OpenAI</option>
              <option value="compatible">OpenAI-compatible</option>
            </select>
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

        {testResults.ai ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <p className="text-sm font-semibold text-slate-950">{testResults.ai.message}</p>
            {testResults.ai.details?.length ? (
              <div className="mt-2 space-y-1 text-xs text-slate-500">
                {testResults.ai.details.map((detail) => (
                  <p key={detail}>{detail}</p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
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
            <div className="flex flex-wrap items-center justify-end gap-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.integrations.outlookEnabled}
                  onChange={(event) => updateIntegrationField("outlookEnabled", event.target.checked)}
                />
                Activé
              </label>
              <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusTone(testResults.outlook?.status)}`}>
                {testResults.outlook ? `${testResults.outlook.status}: ${testResults.outlook.title}` : "Non testé"}
              </span>
              <button
                type="button"
                disabled={testingScope !== null}
                onClick={() => runTest("outlook")}
                className="button-secondary"
              >
                {testingScope === "outlook" ? "Test Outlook..." : "Tester Outlook"}
              </button>
            </div>
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
          {testResults.outlook ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-slate-950">{testResults.outlook.message}</p>
              {testResults.outlook.details?.length ? (
                <div className="mt-2 space-y-1 text-xs text-slate-500">
                  {testResults.outlook.details.map((detail) => (
                    <p key={detail}>{detail}</p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="form-section space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="form-section-title">Notion</h3>
              <p className="form-section-caption">Prépare la connexion et la base de travail Notion.</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.integrations.notionEnabled}
                  onChange={(event) => updateIntegrationField("notionEnabled", event.target.checked)}
                />
                Activé
              </label>
              <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusTone(testResults.notion?.status)}`}>
                {testResults.notion ? `${testResults.notion.status}: ${testResults.notion.title}` : "Non testé"}
              </span>
              <button
                type="button"
                disabled={testingScope !== null}
                onClick={() => runTest("notion")}
                className="button-secondary"
              >
                {testingScope === "notion" ? "Test Notion..." : "Tester Notion"}
              </button>
            </div>
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
          {testResults.notion ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-slate-950">{testResults.notion.message}</p>
              {testResults.notion.details?.length ? (
                <div className="mt-2 space-y-1 text-xs text-slate-500">
                  {testResults.notion.details.map((detail) => (
                    <p key={detail}>{detail}</p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex justify-end gap-3">
        <button disabled={loading} className="button-primary">
          {loading ? "Enregistrement..." : "Enregistrer les paramètres"}
        </button>
      </div>
    </form>
  );
}
