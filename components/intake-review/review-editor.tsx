"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import {
  ACTION_STATUSES,
  COMMUNICATION_STATUSES,
  CONTRACT_STATUSES,
  PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  RENEWAL_TYPES
} from "@/lib/domain/constants";

type ReviewRecord = {
  id: string;
  rawText: string;
  summary: string | null;
  reviewReason: string | null;
  selectedModule: string | null;
  draftData: Record<string, unknown> | null;
  createdEntityHref: string | null;
  status: string;
};

type ReviewEditorProps = {
  review: ReviewRecord;
};

type DraftState = Record<string, unknown>;
type ProjectOption = {
  id: string;
  title: string;
};

const moduleOptions = [
  { value: "actions", label: "Action" },
  { value: "projects", label: "Projet" },
  { value: "vendors", label: "Prestataire" },
  { value: "contracts", label: "Contrat" },
  { value: "budget", label: "Budget" },
  { value: "communications", label: "Communication" }
] as const;

function excerpt(text: string) {
  return text.trim().slice(0, 320);
}

function toDatetimeLocal(value: unknown) {
  if (typeof value !== "string" || !value) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function fromDatetimeLocal(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function buildDefaultDraft(module: string, review: ReviewRecord): DraftState {
  if (module === "actions") {
    return {
      title: "",
      description: review.summary ?? excerpt(review.rawText),
      dueDate: null,
      status: "TODO",
      priority: "NORMAL"
    };
  }

  if (module === "projects") {
    return {
      title: "",
      description: review.summary ?? excerpt(review.rawText),
      type: "DEVELOPMENT",
      status: "DRAFT",
      priority: "NORMAL",
      startDate: null,
      targetDate: null
    };
  }

  if (module === "vendors") {
    return {
      name: "",
      category: "",
      mainContactName: "",
      mainContactEmail: "",
      notes: review.summary ?? excerpt(review.rawText)
    };
  }

  if (module === "contracts") {
    return {
      vendorId: "",
      projectId: "",
      title: "",
      contractType: "",
      status: "DRAFT",
      startDate: null,
      endDate: null,
      noticePeriodDays: null,
      amountPlanned: null,
      notes: review.summary ?? excerpt(review.rawText),
      renewalType: "NONE"
    };
  }

  if (module === "budget") {
    return {
      title: "",
      category: "",
      projectId: "",
      contractId: "",
      vendorId: "",
      fiscalYear: null,
      plannedAmount: null,
      committedAmount: null,
      estimatedActualAmount: null,
      notes: review.summary ?? excerpt(review.rawText)
    };
  }

  return {
    title: "",
    type: "",
    status: "DRAFT",
    contentText: review.rawText,
    contentMarkdown: "",
    projectId: "",
    actionId: "",
    contractId: ""
  };
}

function normalizeDraftForSubmit(module: string, draft: DraftState) {
  if (module === "actions") {
    return {
      ...draft,
      dueDate: typeof draft.dueDate === "string" ? fromDatetimeLocal(draft.dueDate) : draft.dueDate ?? null
    };
  }

  if (module === "projects") {
    return {
      ...draft,
      startDate: typeof draft.startDate === "string" ? fromDatetimeLocal(draft.startDate) : draft.startDate ?? null,
      targetDate: typeof draft.targetDate === "string" ? fromDatetimeLocal(draft.targetDate) : draft.targetDate ?? null
    };
  }

  if (module === "contracts") {
    return {
      ...draft,
      startDate: typeof draft.startDate === "string" ? fromDatetimeLocal(draft.startDate) : draft.startDate ?? null,
      endDate: typeof draft.endDate === "string" ? fromDatetimeLocal(draft.endDate) : draft.endDate ?? null,
      noticePeriodDays: draft.noticePeriodDays === "" ? null : draft.noticePeriodDays,
      amountPlanned: draft.amountPlanned === "" ? null : draft.amountPlanned
    };
  }

  return draft;
}

function renderField(
  label: string,
  input: ReactNode,
  hint?: string
) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {input}
      {hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

export function ReviewEditor({ review }: ReviewEditorProps) {
  const router = useRouter();
  const [selectedModule, setSelectedModule] = useState(review.selectedModule ?? "actions");
  const [draft, setDraft] = useState<DraftState>(() => review.draftData ?? buildDefaultDraft(review.selectedModule ?? "actions", review));
  const [loading, setLoading] = useState<"suggest" | "save" | "approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestionStatus, setSuggestionStatus] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  const moduleLabel = useMemo(
    () => moduleOptions.find((option) => option.value === selectedModule)?.label ?? selectedModule,
    [selectedModule]
  );

  const setValue = (key: string, value: unknown) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    let cancelled = false;

    const loadProjects = async () => {
      const response = await fetch("/api/projects");
      const payload = await response.json();

      if (!response.ok || cancelled) {
        return;
      }

      setProjects(
        Array.isArray(payload.data)
          ? payload.data.map((project: { id: string; title: string }) => ({ id: project.id, title: project.title }))
          : []
      );
    };

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  const changeModule = async (module: string) => {
    setSelectedModule(module);
    setLoading("suggest");
    setError(null);
    setSuggestionStatus(null);

    const response = await fetch(`/api/ai/reviews/${review.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "suggest",
        selectedModule: module
      })
    });
    const payload = await response.json();

    if (!response.ok) {
      setDraft(buildDefaultDraft(module, review));
      setError(payload.error ?? "Impossible de proposer les champs pour ce module.");
      setLoading(null);
      return;
    }

    setDraft(payload.data?.review?.draftData ?? buildDefaultDraft(module, review));
    setSuggestionStatus(payload.data?.suggestion?.message ?? "Champs proposés pour le module sélectionné.");
    setLoading(null);
  };

  const saveDraft = async () => {
    setLoading("save");
    setError(null);

    const response = await fetch(`/api/ai/reviews/${review.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        selectedModule,
        draftData: normalizeDraftForSubmit(selectedModule, draft)
      })
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Impossible d’enregistrer le brouillon.");
      setLoading(null);
      return;
    }

    setLoading(null);
    router.refresh();
  };

  const resolveReview = async (action: "approve" | "reject") => {
    setLoading(action === "approve" ? "approve" : "reject");
    setError(null);

    const response = await fetch(`/api/ai/reviews/${review.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        action === "approve"
          ? {
              action,
              selectedModule,
              draftData: normalizeDraftForSubmit(selectedModule, draft)
            }
          : { action }
      )
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Impossible de finaliser la demande.");
      setLoading(null);
      return;
    }

    setLoading(null);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Décision manuelle</h3>
          <p className="form-section-caption">Choisis le bon module, complète les champs utiles, puis valide la création.</p>
        </div>
        {renderField(
          "Module cible",
          <select value={selectedModule} onChange={(event) => changeModule(event.target.value)} className="field-select" disabled={review.status !== "PENDING"}>
            {moduleOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        )}
        {loading === "suggest" ? <p className="text-sm text-slate-500">Analyse IA du module en cours...</p> : null}
        {suggestionStatus ? <p className="text-sm text-slate-600">{suggestionStatus}</p> : null}
      </section>

      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Champs {moduleLabel.toLowerCase()}</h3>
          <p className="form-section-caption">Le brouillon est modifiable avant création. Rien n’est inséré tant que tu ne valides pas.</p>
        </div>

        {selectedModule === "actions" && (
          <>
            {renderField("Titre", <input value={String(draft.title ?? "")} onChange={(e) => setValue("title", e.target.value)} className="field-input" />)}
            {renderField("Description", <textarea value={String(draft.description ?? "")} onChange={(e) => setValue("description", e.target.value)} rows={4} className="field-textarea" />)}
            {renderField(
              "Projet",
              <select value={String(draft.projectId ?? "")} onChange={(e) => setValue("projectId", e.target.value)} className="field-select">
                <option value="">Aucun projet</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            )}
            <div className="grid gap-3 md:grid-cols-3">
              {renderField("Statut", <select value={String(draft.status ?? "TODO")} onChange={(e) => setValue("status", e.target.value)} className="field-select">{ACTION_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}</select>)}
              {renderField("Priorité", <select value={String(draft.priority ?? "NORMAL")} onChange={(e) => setValue("priority", e.target.value)} className="field-select">{PRIORITIES.map((value) => <option key={value} value={value}>{value}</option>)}</select>)}
              {renderField("Échéance", <input type="datetime-local" value={typeof draft.dueDate === "string" ? (draft.dueDate.includes("T") && draft.dueDate.endsWith("Z") ? toDatetimeLocal(draft.dueDate) : String(draft.dueDate)) : ""} onChange={(e) => setValue("dueDate", e.target.value)} className="field-input" />)}
            </div>
          </>
        )}

        {selectedModule === "projects" && (
          <>
            {renderField("Titre", <input value={String(draft.title ?? "")} onChange={(e) => setValue("title", e.target.value)} className="field-input" />)}
            {renderField("Description", <textarea value={String(draft.description ?? "")} onChange={(e) => setValue("description", e.target.value)} rows={4} className="field-textarea" />)}
            <div className="grid gap-3 md:grid-cols-3">
              {renderField("Type", <select value={String(draft.type ?? "DEVELOPMENT")} onChange={(e) => setValue("type", e.target.value)} className="field-select">{PROJECT_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}</select>)}
              {renderField("Statut", <select value={String(draft.status ?? "DRAFT")} onChange={(e) => setValue("status", e.target.value)} className="field-select">{PROJECT_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}</select>)}
              {renderField("Priorité", <select value={String(draft.priority ?? "NORMAL")} onChange={(e) => setValue("priority", e.target.value)} className="field-select">{PRIORITIES.map((value) => <option key={value} value={value}>{value}</option>)}</select>)}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {renderField("Début", <input type="datetime-local" value={typeof draft.startDate === "string" ? (draft.startDate.includes("T") && draft.startDate.endsWith("Z") ? toDatetimeLocal(draft.startDate) : String(draft.startDate)) : ""} onChange={(e) => setValue("startDate", e.target.value)} className="field-input" />)}
              {renderField("Cible", <input type="datetime-local" value={typeof draft.targetDate === "string" ? (draft.targetDate.includes("T") && draft.targetDate.endsWith("Z") ? toDatetimeLocal(draft.targetDate) : String(draft.targetDate)) : ""} onChange={(e) => setValue("targetDate", e.target.value)} className="field-input" />)}
            </div>
          </>
        )}

        {selectedModule === "vendors" && (
          <>
            {renderField("Nom", <input value={String(draft.name ?? "")} onChange={(e) => setValue("name", e.target.value)} className="field-input" />)}
            <div className="grid gap-3 md:grid-cols-2">
              {renderField("Catégorie", <input value={String(draft.category ?? "")} onChange={(e) => setValue("category", e.target.value)} className="field-input" />)}
              {renderField("Contact principal", <input value={String(draft.mainContactName ?? "")} onChange={(e) => setValue("mainContactName", e.target.value)} className="field-input" />)}
            </div>
            {renderField("Email contact", <input type="email" value={String(draft.mainContactEmail ?? "")} onChange={(e) => setValue("mainContactEmail", e.target.value)} className="field-input" />)}
            {renderField("Notes", <textarea value={String(draft.notes ?? "")} onChange={(e) => setValue("notes", e.target.value)} rows={4} className="field-textarea" />)}
          </>
        )}

        {selectedModule === "contracts" && (
          <>
            {renderField("Titre", <input value={String(draft.title ?? "")} onChange={(e) => setValue("title", e.target.value)} className="field-input" />)}
            <div className="grid gap-3 md:grid-cols-2">
              {renderField("Vendor ID", <input value={String(draft.vendorId ?? "")} onChange={(e) => setValue("vendorId", e.target.value)} className="field-input" />, "Obligatoire pour créer le contrat.")}
              {renderField("Project ID", <input value={String(draft.projectId ?? "")} onChange={(e) => setValue("projectId", e.target.value)} className="field-input" />)}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {renderField("Type", <input value={String(draft.contractType ?? "")} onChange={(e) => setValue("contractType", e.target.value)} className="field-input" />)}
              {renderField("Statut", <select value={String(draft.status ?? "DRAFT")} onChange={(e) => setValue("status", e.target.value)} className="field-select">{CONTRACT_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}</select>)}
              {renderField("Renouvellement", <select value={String(draft.renewalType ?? "NONE")} onChange={(e) => setValue("renewalType", e.target.value)} className="field-select">{RENEWAL_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}</select>)}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {renderField("Début", <input type="datetime-local" value={typeof draft.startDate === "string" ? (draft.startDate.includes("T") && draft.startDate.endsWith("Z") ? toDatetimeLocal(draft.startDate) : String(draft.startDate)) : ""} onChange={(e) => setValue("startDate", e.target.value)} className="field-input" />)}
              {renderField("Fin", <input type="datetime-local" value={typeof draft.endDate === "string" ? (draft.endDate.includes("T") && draft.endDate.endsWith("Z") ? toDatetimeLocal(draft.endDate) : String(draft.endDate)) : ""} onChange={(e) => setValue("endDate", e.target.value)} className="field-input" />)}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {renderField("Préavis (jours)", <input type="number" value={draft.noticePeriodDays === null ? "" : String(draft.noticePeriodDays ?? "")} onChange={(e) => setValue("noticePeriodDays", e.target.value === "" ? null : Number(e.target.value))} className="field-input" />)}
              {renderField("Montant prévu", <input type="number" value={draft.amountPlanned === null ? "" : String(draft.amountPlanned ?? "")} onChange={(e) => setValue("amountPlanned", e.target.value === "" ? null : Number(e.target.value))} className="field-input" />)}
            </div>
            {renderField("Notes", <textarea value={String(draft.notes ?? "")} onChange={(e) => setValue("notes", e.target.value)} rows={4} className="field-textarea" />)}
          </>
        )}

        {selectedModule === "budget" && (
          <>
            {renderField("Titre", <input value={String(draft.title ?? "")} onChange={(e) => setValue("title", e.target.value)} className="field-input" />)}
            <div className="grid gap-3 md:grid-cols-2">
              {renderField("Catégorie", <input value={String(draft.category ?? "")} onChange={(e) => setValue("category", e.target.value)} className="field-input" />)}
              {renderField("Exercice", <input type="number" value={draft.fiscalYear === null ? "" : String(draft.fiscalYear ?? "")} onChange={(e) => setValue("fiscalYear", e.target.value === "" ? null : Number(e.target.value))} className="field-input" />)}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {renderField("Montant prévu", <input type="number" value={draft.plannedAmount === null ? "" : String(draft.plannedAmount ?? "")} onChange={(e) => setValue("plannedAmount", e.target.value === "" ? null : Number(e.target.value))} className="field-input" />)}
              {renderField("Montant engagé", <input type="number" value={draft.committedAmount === null ? "" : String(draft.committedAmount ?? "")} onChange={(e) => setValue("committedAmount", e.target.value === "" ? null : Number(e.target.value))} className="field-input" />)}
              {renderField("Atterrissage", <input type="number" value={draft.estimatedActualAmount === null ? "" : String(draft.estimatedActualAmount ?? "")} onChange={(e) => setValue("estimatedActualAmount", e.target.value === "" ? null : Number(e.target.value))} className="field-input" />)}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {renderField("Project ID", <input value={String(draft.projectId ?? "")} onChange={(e) => setValue("projectId", e.target.value)} className="field-input" />)}
              {renderField("Contract ID", <input value={String(draft.contractId ?? "")} onChange={(e) => setValue("contractId", e.target.value)} className="field-input" />)}
              {renderField("Vendor ID", <input value={String(draft.vendorId ?? "")} onChange={(e) => setValue("vendorId", e.target.value)} className="field-input" />)}
            </div>
            {renderField("Notes", <textarea value={String(draft.notes ?? "")} onChange={(e) => setValue("notes", e.target.value)} rows={4} className="field-textarea" />)}
          </>
        )}

        {selectedModule === "communications" && (
          <>
            {renderField("Titre", <input value={String(draft.title ?? "")} onChange={(e) => setValue("title", e.target.value)} className="field-input" />)}
            <div className="grid gap-3 md:grid-cols-2">
              {renderField("Type", <input value={String(draft.type ?? "")} onChange={(e) => setValue("type", e.target.value)} className="field-input" />)}
              {renderField("Statut", <select value={String(draft.status ?? "DRAFT")} onChange={(e) => setValue("status", e.target.value)} className="field-select">{COMMUNICATION_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}</select>)}
            </div>
            {renderField("Contenu texte", <textarea value={String(draft.contentText ?? "")} onChange={(e) => setValue("contentText", e.target.value)} rows={6} className="field-textarea" />)}
            <div className="grid gap-3 md:grid-cols-3">
              {renderField("Project ID", <input value={String(draft.projectId ?? "")} onChange={(e) => setValue("projectId", e.target.value)} className="field-input" />)}
              {renderField("Action ID", <input value={String(draft.actionId ?? "")} onChange={(e) => setValue("actionId", e.target.value)} className="field-input" />)}
              {renderField("Contract ID", <input value={String(draft.contractId ?? "")} onChange={(e) => setValue("contractId", e.target.value)} className="field-input" />)}
            </div>
          </>
        )}
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="form-actions">
        <p className="form-actions-note">
          {review.status === "PENDING"
            ? "Le brouillon peut être sauvegardé, puis validé manuellement."
            : review.createdEntityHref
              ? "Cette demande a déjà été traitée."
              : "Cette demande a été clôturée sans création."}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {review.createdEntityHref ? (
            <Link href={review.createdEntityHref} className="button-secondary">
              Ouvrir l’entrée créée
            </Link>
          ) : null}
          {review.status === "PENDING" ? (
            <>
              <button type="button" onClick={saveDraft} disabled={loading !== null} className="button-secondary">
                {loading === "save" ? "Enregistrement..." : "Sauvegarder"}
              </button>
              <button type="button" onClick={() => resolveReview("reject")} disabled={loading !== null} className="button-secondary">
                {loading === "reject" ? "Classement..." : "Rejeter"}
              </button>
              <button type="button" onClick={() => resolveReview("approve")} disabled={loading !== null} className="button-primary">
                {loading === "approve" ? "Création..." : "Valider et créer"}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
