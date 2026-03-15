"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PRIORITIES, PROJECT_STATUSES, PROJECT_TYPES } from "@/lib/domain/constants";

type ProjectFormValues = {
  title: string;
  description?: string | null;
  type: (typeof PROJECT_TYPES)[number];
  status: (typeof PROJECT_STATUSES)[number];
  priority: (typeof PRIORITIES)[number];
  startDate?: string | null;
  targetDate?: string | null;
};

type ProjectFormProps = {
  mode?: "create" | "edit";
  projectId?: string;
  initialValues?: Partial<ProjectFormValues>;
  showHeader?: boolean;
};

export function ProjectForm({ mode = "create", projectId, initialValues, showHeader = true }: ProjectFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [type, setType] = useState<(typeof PROJECT_TYPES)[number]>(initialValues?.type ?? "DEVELOPMENT");
  const [status, setStatus] = useState<(typeof PROJECT_STATUSES)[number]>(initialValues?.status ?? "DRAFT");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>(initialValues?.priority ?? "NORMAL");
  const [startDate, setStartDate] = useState(initialValues?.startDate ?? "");
  const [targetDate, setTargetDate] = useState(initialValues?.targetDate ?? "");

  useEffect(() => {
    setTitle(initialValues?.title ?? "");
    setDescription(initialValues?.description ?? "");
    setType(initialValues?.type ?? "DEVELOPMENT");
    setStatus(initialValues?.status ?? "DRAFT");
    setPriority(initialValues?.priority ?? "NORMAL");
    setStartDate(initialValues?.startDate ?? "");
    setTargetDate(initialValues?.targetDate ?? "");
  }, [initialValues, mode, projectId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch(projectId ? `/api/projects/${projectId}` : "/api/projects", {
      method: projectId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        type,
        status,
        priority,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        targetDate: targetDate ? new Date(targetDate).toISOString() : null
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
      setDescription("");
      setType("DEVELOPMENT");
      setStatus("DRAFT");
      setPriority("NORMAL");
      setStartDate("");
      setTargetDate("");
    }

    setLoading(false);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="form-stack">
      {showHeader && <h2 className="panel-title">{mode === "create" ? "Nouveau projet" : "Modifier le projet"}</h2>}
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Cadre du projet</h3>
          <p className="form-section-caption">Pose le périmètre du projet avant de détailler son pilotage.</p>
        </div>
        <div>
          <label className="field-label">Titre</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Refonte du poste de travail"
            required
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Objectif, périmètre, résultat attendu..."
            rows={4}
            className="field-textarea"
          />
        </div>
      </section>
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Pilotage</h3>
          <p className="form-section-caption">Définis la nature du projet, son statut courant et son niveau de priorité.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="field-label">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as (typeof PROJECT_TYPES)[number])} className="field-select">
              {PROJECT_TYPES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Statut</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as (typeof PROJECT_STATUSES)[number])} className="field-select">
              {PROJECT_STATUSES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Priorité</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as (typeof PRIORITIES)[number])} className="field-select">
              {PRIORITIES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>
      </section>
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Temporalité</h3>
          <p className="form-section-caption">Ajoute des repères de calendrier si tu veux faire remonter les alertes et les échéances.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="field-label">Début</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">Cible</label>
            <input
              type="datetime-local"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="field-input"
            />
          </div>
        </div>
      </section>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="form-actions">
        <p className="form-actions-note">Le panneau garde le contexte de portefeuille pendant l’édition.</p>
        <button disabled={loading} className="button-primary">
          {loading ? (mode === "create" ? "Création..." : "Enregistrement...") : mode === "create" ? "Créer le projet" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
