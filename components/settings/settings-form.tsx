"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AppSettings } from "@/lib/settings/schema";

type SettingsFormProps = {
  initialSettings: AppSettings;
  activeModel: string;
  activeProvider: "openai" | "compatible" | "local";
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

const providerLabels = { openai: "OpenAI", compatible: "API compatible OpenAI", local: "Moteur local" };
const statusLabels = { success: "Réussi", warning: "À vérifier", error: "Échec" };

export function SettingsForm({ initialSettings, activeModel, activeProvider }: SettingsFormProps) {
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
  const [notice, setNotice] = useState("");
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

    setNotice("");
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Impossible d’enregistrer les paramètres.");
        return;
      }
      setSettings(payload.data);
      setNotice("Paramètres enregistrés.");
      router.refresh();
    } catch {
      setError("Impossible de joindre le serveur. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const runTest = async (scope: "ai" | "outlook" | "notion") => {
    setTestingScope(scope);
    setError(null);

    try {
      const response = await fetch("/api/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, settings })
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Impossible de tester la configuration.");
        return;
      }
      setTestResults((current) => ({ ...current, [scope]: payload.data.results[0] }));
    } catch {
      setError("Impossible de joindre le serveur. Réessayez.");
    } finally {
      setTestingScope(null);
    }
  };

  const openAIFields = (
    <div className="form-section space-y-3">
      <h3 className="form-section-title">OpenAI</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="md:col-span-2">
          <span className="field-label">Clé API</span>
          <input
            type="password"
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
          <span className="field-label">Catalogue de modèles</span>
          <input
            value={settings.ai.openAIModels}
            onChange={(event) => updateAIField("openAIModels", event.target.value)}
            className="field-input"
            placeholder="gpt-4.1,gpt-4.1-mini"
          />
        </label>
      </div>
    </div>
  );
  const compatibleFields = (
    <div className="form-section space-y-3">
      <h3 className="form-section-title">API compatible OpenAI</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="md:col-span-2">
          <span className="field-label">Adresse de l’API</span>
          <input
            value={settings.ai.compatibleBaseUrl}
            onChange={(event) => updateAIField("compatibleBaseUrl", event.target.value)}
            className="field-input"
            placeholder="http://host.docker.internal:11434/v1"
          />
        </label>
        <label className="md:col-span-2">
          <span className="field-label">Clé API</span>
          <input
            type="password"
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
          <span className="field-label">Catalogue de modèles</span>
          <input
            value={settings.ai.compatibleModels}
            onChange={(event) => updateAIField("compatibleModels", event.target.value)}
            className="field-input"
            placeholder="llama3.1:8b,qwen2.5:14b"
          />
        </label>
      </div>
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-5">
      <section className="workbench-panel space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="panel-title">IA</h2>
            <p className="panel-caption">Fournisseur utilisé : {providerLabels[activeProvider]}{activeModel ? ` · ${activeModel}` : ""}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusTone(testResults.ai?.status)}`}>
              {testResults.ai ? `${statusLabels[testResults.ai.status]} · ${testResults.ai.title}` : "Non testé"}
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
            <span className="field-label">Fournisseur à enregistrer</span>
            <select
              value={settings.ai.providerMode}
              onChange={(event) => updateAIField("providerMode", event.target.value)}
              className="field-select"
            >
              <option value="openai">OpenAI</option>
              <option value="compatible">API compatible OpenAI</option>
            </select>
          </label>
        </div>

        {settings.ai.providerMode === "openai" ? openAIFields : compatibleFields}
        <details className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <summary className="cursor-pointer font-semibold">Autre fournisseur</summary>
          <div className="mt-3">{settings.ai.providerMode === "openai" ? compatibleFields : openAIFields}</div>
        </details>

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
          <h2 className="panel-title">Configuration Outlook et Notion</h2>
        </div>

        <div id="outlook-settings" className="form-section space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="form-section-title">Outlook</h3>
              <p className="form-section-caption">Connexion à la boîte Microsoft 365.</p>
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
                {testResults.outlook ? `${statusLabels[testResults.outlook.status]} · ${testResults.outlook.title}` : "Non testé"}
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
              <span className="field-label">Identifiant du tenant</span>
              <input
                value={settings.integrations.outlookTenantId}
                onChange={(event) => updateIntegrationField("outlookTenantId", event.target.value)}
                className="field-input"
              />
            </label>
            <label>
              <span className="field-label">Identifiant client</span>
              <input
                value={settings.integrations.outlookClientId}
                onChange={(event) => updateIntegrationField("outlookClientId", event.target.value)}
                className="field-input"
              />
            </label>
            <label className="md:col-span-2">
              <span className="field-label">Secret client</span>
              <input
                value={settings.integrations.outlookClientSecret}
                onChange={(event) => updateIntegrationField("outlookClientSecret", event.target.value)}
                className="field-input"
                type="password"
                placeholder="Secret de l'application Entra ID"
              />
            </label>
          </div>
          <p className="text-xs text-slate-500">
            Après enregistrement, connectez la boîte depuis le module E-mails.
          </p>
          <details>
            <summary className="cursor-pointer text-sm font-semibold">Synchronisation et automatisation</summary>
            <div className="mt-3 space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={settings.integrations.outlookPollingEnabled}
                    onChange={(event) => updateIntegrationField("outlookPollingEnabled", event.target.checked)}
                  />
                  Synchronisation périodique
                </label>
                <label>
                  <span className="field-label">Intervalle de lecture</span>
                  <input
                    value={String(settings.integrations.outlookPollingIntervalMinutes)}
                    onChange={(event) => updateIntegrationField("outlookPollingIntervalMinutes", event.target.value)}
                    className="field-input"
                    type="number"
                    min={1}
                    max={1440}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={settings.integrations.outlookAutomationEnabled}
                    onChange={(event) => updateIntegrationField("outlookAutomationEnabled", event.target.checked)}
                  />
                  Extraction automatique
                </label>
                <label>
                  <span className="field-label">Catégories Outlook</span>
                  <input
                    value={settings.integrations.outlookAutomationCategory}
                    onChange={(event) => updateIntegrationField("outlookAutomationCategory", event.target.value)}
                    className="field-input"
                    placeholder="assistant,prioritaire"
                  />
                </label>
              </div>
              <p className="text-xs text-slate-500">
                Les e-mails correspondant aux catégories choisies sont traités automatiquement.
              </p>
            </div>
          </details>
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
          <div className="flex flex-wrap items-center justify-between gap-3">
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
                {testResults.notion ? `${statusLabels[testResults.notion.status]} · ${testResults.notion.title}` : "Non testé"}
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
              <span className="field-label">Clé API</span>
              <input
                type="password"
                value={settings.integrations.notionApiKey}
                onChange={(event) => updateIntegrationField("notionApiKey", event.target.value)}
                className="field-input"
              />
            </label>
            <label>
              <span className="field-label">Identifiant de la base</span>
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

      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <p role="status" className="text-sm text-emerald-700">{notice}</p>
        <button disabled={loading} className="button-primary">
          {loading ? "Enregistrement..." : "Enregistrer les paramètres"}
        </button>
      </div>
    </form>
  );
}
