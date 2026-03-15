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
  showHeader?: boolean;
};

export function CommunicationForm({
  mode = "create",
  communicationId,
  projectOptions,
  actionOptions,
  contractOptions,
  initialValues,
  showHeader = true
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

  useEffect(() => {
    setTitle(initialValues?.title ?? "");
    setType(initialValues?.type ?? "");
    setStatus(initialValues?.status ?? "DRAFT");
    setTemplateKey(initialValues?.templateKey ?? "");
    setTemplateInputData(initialValues?.templateInputData ?? {});
    setContentText(initialValues?.contentText ?? "");
    setContentMarkdown(initialValues?.contentMarkdown ?? "");
    setProjectId(initialValues?.projectId ?? "");
    setActionId(initialValues?.actionId ?? "");
    setContractId(initialValues?.contractId ?? "");
    setAutoGenerate(Boolean(initialValues?.templateKey));
  }, [communicationId, initialValues, mode]);

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
    <form onSubmit={submit} className="form-stack">
      {showHeader && <h2 className="panel-title">{mode === "create" ? "Nouvelle communication" : "Modifier la communication"}</h2>}
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Cadre éditorial</h3>
          <p className="form-section-caption">Choisis un template si tu veux partir d’une trame guidée, sinon rédige librement.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="field-label">Template</label>
            <select
              value={templateKey}
              onChange={(e) => {
                const nextTemplateKey = e.target.value as CommunicationTemplateKey | "";
                setTemplateKey(nextTemplateKey);
                setTemplateInputData({});
                setAutoGenerate(Boolean(nextTemplateKey));
              }}
              className="field-select"
            >
              <option value="">Aucun template</option>
              {Object.values(communicationTemplates).map((template) => (
                <option key={template.key} value={template.key}>
                  {template.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Type</label>
            <input
              value={type}
              onChange={(e) => {
                setAutoGenerate(false);
                setType(e.target.value);
              }}
              placeholder="Email, note, annonce..."
              className="field-input"
            />
          </div>
        </div>
        <div>
          <label className="field-label">Titre</label>
          <input
            value={title}
            onChange={(e) => {
              setAutoGenerate(false);
              setTitle(e.target.value);
            }}
            placeholder="Titre de communication"
            required
            className="field-input"
          />
        </div>
      </section>
      {selectedTemplate && (
        <section className="form-section space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="form-section-title">{selectedTemplate.label}</h3>
              <p className="form-section-caption">{selectedTemplate.description}</p>
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
              <button type="button" onClick={() => setAutoGenerate(true)} className="button-secondary">
                Régénérer
              </button>
            </div>
          </div>
          <p className="field-hint">Remplis d’abord les champs du template, puis ajuste le texte généré si nécessaire.</p>
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
                className: field.type === "textarea" ? "field-textarea" : "field-input"
              };

              return (
                <label key={field.key} className={field.type === "textarea" ? "md:col-span-2" : ""}>
                  <span className="field-label">{field.label}</span>
                  {field.type === "textarea" ? (
                    <textarea {...commonProps} rows={4} />
                  ) : (
                    <input {...commonProps} type={field.type === "date" ? "date" : "text"} />
                  )}
                </label>
              );
            })}
          </div>
        </section>
      )}
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Diffusion et rattachement</h3>
          <p className="form-section-caption">Positionne la communication dans son cycle de vie et rattache-la au bon contexte métier.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="field-label">Statut</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as (typeof COMMUNICATION_STATUSES)[number])} className="field-select">
              {COMMUNICATION_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="workbench-section text-sm text-slate-600">
            Les templates remplissent automatiquement le titre et le contenu. Toute modification manuelle coupe cette génération jusqu&apos;à régénération.
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="field-label">Projet</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="field-select">
              <option value="">Aucun projet</option>
              {projectOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Action</label>
            <select value={actionId} onChange={(e) => setActionId(e.target.value)} className="field-select">
              <option value="">Aucune action</option>
              {actionOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Contrat</label>
            <select value={contractId} onChange={(e) => setContractId(e.target.value)} className="field-select">
              <option value="">Aucun contrat</option>
              {contractOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Contenu</h3>
          <p className="form-section-caption">Le texte simple sert à la lecture rapide. Le Markdown permet l’export et la mise en forme.</p>
        </div>
        <div>
          <label className="field-label">Contenu texte</label>
          <textarea
            value={contentText}
            onChange={(e) => {
              setAutoGenerate(false);
              setContentText(e.target.value);
            }}
            placeholder="Version texte lisible rapidement"
            rows={5}
            className="field-textarea"
          />
        </div>
        <div>
          <label className="field-label">Contenu Markdown</label>
          <textarea
            value={contentMarkdown}
            onChange={(e) => {
              setAutoGenerate(false);
              setContentMarkdown(e.target.value);
            }}
            placeholder="Version structurée pour export"
            rows={8}
            className="field-textarea font-mono text-sm"
          />
        </div>
      </section>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="form-actions">
        <p className="form-actions-note">Tu peux partir d’un template puis reprendre la main champ par champ.</p>
        <button disabled={loading} className="button-primary">
          {loading ? (mode === "create" ? "Création..." : "Enregistrement...") : mode === "create" ? "Créer la communication" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
