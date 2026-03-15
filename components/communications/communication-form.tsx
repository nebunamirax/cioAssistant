"use client";

import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import {
  communicationTemplates,
  getCommunicationTemplate,
  renderCommunicationTemplate,
  sanitizeTemplateInputData,
  type CommunicationTemplateInputData,
  type CommunicationTemplateKey
} from "@/lib/communications/templates";
import { COMMUNICATION_STATUSES } from "@/lib/domain/constants";

type Option = {
  id: string;
  label: string;
};

type CommunicationFormValues = {
  title: string;
  type?: string | null;
  status: (typeof COMMUNICATION_STATUSES)[number];
  templateKey?: CommunicationTemplateKey | "" | null;
  templateInputData?: CommunicationTemplateInputData | null;
  contentText?: string | null;
  contentMarkdown?: string | null;
  projectId?: string | null;
  actionId?: string | null;
  contractId?: string | null;
};

type CommunicationFormProps = {
  mode?: "create" | "edit";
  communicationId?: string;
  projectOptions: Option[];
  actionOptions: Option[];
  contractOptions: Option[];
  initialValues?: Partial<CommunicationFormValues>;
};

export function CommunicationForm({
  mode = "create",
  communicationId,
  projectOptions,
  actionOptions,
  contractOptions,
  initialValues
}: CommunicationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [type, setType] = useState(initialValues?.type ?? "");
  const [status, setStatus] = useState<(typeof COMMUNICATION_STATUSES)[number]>(initialValues?.status ?? "DRAFT");
  const [templateKey, setTemplateKey] = useState<CommunicationTemplateKey | "">(initialValues?.templateKey ?? "");
  const [templateInputData, setTemplateInputData] = useState<CommunicationTemplateInputData>(initialValues?.templateInputData ?? {});
  const [contentText, setContentText] = useState(initialValues?.contentText ?? "");
  const [contentMarkdown, setContentMarkdown] = useState(initialValues?.contentMarkdown ?? "");
  const [projectId, setProjectId] = useState(initialValues?.projectId ?? "");
  const [actionId, setActionId] = useState(initialValues?.actionId ?? "");
  const [contractId, setContractId] = useState(initialValues?.contractId ?? "");
  const [autoGenerate, setAutoGenerate] = useState(Boolean(initialValues?.templateKey));

  const selectedTemplate = getCommunicationTemplate(templateKey);
  const projectTitle = projectOptions.find((option) => option.id === projectId)?.label;
  const actionTitle = actionOptions.find((option) => option.id === actionId)?.label;
  const contractTitle = contractOptions.find((option) => option.id === contractId)?.label;

  useEffect(() => {
    if (!templateKey || !autoGenerate) {
      return;
    }

    const generated = renderCommunicationTemplate(
      templateKey,
      sanitizeTemplateInputData(templateInputData),
      {
        projectTitle,
        actionTitle,
        contractTitle
      }
    );

    setTitle(generated.title);
    setType(generated.type);
    setContentText(generated.contentText);
    setContentMarkdown(generated.contentMarkdown);
  }, [actionTitle, autoGenerate, contractTitle, projectTitle, templateInputData, templateKey]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch(communicationId ? `/api/communications/${communicationId}` : "/api/communications", {
      method: communicationId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        type,
        status,
        templateKey: templateKey || null,
        templateInputData: sanitizeTemplateInputData(templateInputData),
        contentText,
        contentMarkdown,
        projectId,
        actionId,
        contractId
      })
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Une erreur est survenue.");
      setLoading(false);
      return;
    }

    if (mode === "create") {
      setTitle("");
      setType("");
      setStatus("DRAFT");
      setTemplateKey("");
      setTemplateInputData({});
      setContentText("");
      setContentMarkdown("");
      setProjectId("");
      setActionId("");
      setContractId("");
      setAutoGenerate(false);
    }

    setLoading(false);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="font-semibold">{mode === "create" ? "Nouvelle communication" : "Modifier la communication"}</h2>
      <input
        value={title}
        onChange={(e) => {
          setAutoGenerate(false);
          setTitle(e.target.value);
        }}
        placeholder="Titre"
        required
        className="w-full rounded border border-slate-300 px-3 py-2"
      />
      <div className="grid gap-3 md:grid-cols-2">
        <select
          value={templateKey}
          onChange={(e) => {
            const nextTemplateKey = e.target.value as CommunicationTemplateKey | "";
            setTemplateKey(nextTemplateKey);
            setTemplateInputData({});
            setAutoGenerate(Boolean(nextTemplateKey));
          }}
          className="rounded border border-slate-300 px-3 py-2"
        >
          <option value="">Aucun template</option>
          {Object.values(communicationTemplates).map((template) => (
            <option key={template.key} value={template.key}>
              {template.label}
            </option>
          ))}
        </select>
        <input
          value={type}
          onChange={(e) => {
            setAutoGenerate(false);
            setType(e.target.value);
          }}
          placeholder="Type (email, note, annonce...)"
          className="w-full rounded border border-slate-300 px-3 py-2"
        />
      </div>
      {selectedTemplate && (
        <div className="space-y-3 rounded border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-slate-900">{selectedTemplate.label}</p>
              <p className="text-sm text-slate-600">{selectedTemplate.description}</p>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoGenerate}
                  onChange={(e) => setAutoGenerate(e.target.checked)}
                />
                Génération automatique
              </label>
              <button
                type="button"
                onClick={() => setAutoGenerate(true)}
                className="rounded border border-slate-300 px-3 py-2"
              >
                Régénérer
              </button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {selectedTemplate.fields.map((field) => {
              const commonProps = {
                value: templateInputData[field.key] ?? "",
                onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                  setTemplateInputData((current) => ({
                    ...current,
                    [field.key]: e.target.value
                  }));
                },
                placeholder: field.placeholder,
                className: "w-full rounded border border-slate-300 px-3 py-2"
              };

              return (
                <label key={field.key} className={field.type === "textarea" ? "md:col-span-2" : ""}>
                  <span className="mb-1 block text-sm font-medium text-slate-700">{field.label}</span>
                  {field.type === "textarea" ? (
                    <textarea {...commonProps} rows={4} />
                  ) : (
                    <input {...commonProps} type={field.type === "date" ? "date" : "text"} />
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <select value={status} onChange={(e) => setStatus(e.target.value as (typeof COMMUNICATION_STATUSES)[number])} className="rounded border border-slate-300 px-3 py-2">
          {COMMUNICATION_STATUSES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Les templates remplissent automatiquement le titre et le contenu. Toute modification manuelle coupe cette génération jusqu'à régénération.
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded border border-slate-300 px-3 py-2">
          <option value="">Aucun projet</option>
          {projectOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <select value={actionId} onChange={(e) => setActionId(e.target.value)} className="rounded border border-slate-300 px-3 py-2">
          <option value="">Aucune action</option>
          {actionOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <select value={contractId} onChange={(e) => setContractId(e.target.value)} className="rounded border border-slate-300 px-3 py-2">
          <option value="">Aucun contrat</option>
          {contractOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <textarea
        value={contentText}
        onChange={(e) => {
          setAutoGenerate(false);
          setContentText(e.target.value);
        }}
        placeholder="Contenu texte"
        rows={5}
        className="w-full rounded border border-slate-300 px-3 py-2"
      />
      <textarea
        value={contentMarkdown}
        onChange={(e) => {
          setAutoGenerate(false);
          setContentMarkdown(e.target.value);
        }}
        placeholder="Contenu Markdown"
        rows={8}
        className="w-full rounded border border-slate-300 px-3 py-2 font-mono text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={loading} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
        {loading ? (mode === "create" ? "Création..." : "Enregistrement...") : mode === "create" ? "Créer" : "Enregistrer"}
      </button>
    </form>
  );
}
