"use client";

import { projectTypeLabels, projectLabels, priorityLabels } from "@/lib/domain/display-labels";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PRIORITIES, PROJECT_STATUSES, PROJECT_TYPES } from "@/lib/domain/constants";

type ProjectFormValues = {
  title: string;
  description?: string | null;
  type: (typeof PROJECT_TYPES)[number];
  status: (typeof PROJECT_STATUSES)[number];
  priority: (typeof PRIORITIES)[number];
  ownerId?: string | null;
  startDate?: string | null;
  targetDate?: string | null;
};

type ProjectFormProps = {
  mode?: "create" | "edit";
  projectId?: string;
  initialValues?: Partial<ProjectFormValues>;
  showHeader?: boolean;
  owners?: { id: string; name: string }[];
};

export function ProjectForm({ mode = "create", projectId, initialValues, showHeader = true, owners }: ProjectFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [type, setType] = useState<(typeof PROJECT_TYPES)[number]>(initialValues?.type ?? "DEVELOPMENT");
  const [status, setStatus] = useState<(typeof PROJECT_STATUSES)[number]>(initialValues?.status ?? "DRAFT");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>(initialValues?.priority ?? "NORMAL");
  const [ownerId, setOwnerId] = useState(initialValues?.ownerId ?? "");
  const [startDate, setStartDate] = useState(initialValues?.startDate ?? "");
  const [targetDate, setTargetDate] = useState(initialValues?.targetDate ?? "");

  useEffect(() => {
    setTitle(initialValues?.title ?? "");
    setDescription(initialValues?.description ?? "");
    setType(initialValues?.type ?? "DEVELOPMENT");
    setStatus(initialValues?.status ?? "DRAFT");
    setPriority(initialValues?.priority ?? "NORMAL");
    setOwnerId(initialValues?.ownerId ?? "");
    setStartDate(initialValues?.startDate ?? "");
    setTargetDate(initialValues?.targetDate ?? "");
  }, [initialValues, mode, projectId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(projectId ? `/api/projects/${projectId}` : "/api/projects", {
        method: projectId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          type,
          status,
          priority,
          ...(owners ? { ownerId: ownerId || null } : {}),
          startDate: startDate ? new Date(startDate).toISOString() : null,
          targetDate: targetDate ? new Date(targetDate).toISOString() : null
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Une erreur est survenue.");
        return;
      }

      if (mode === "create") {
        setTitle("");
        setDescription("");
        setType("DEVELOPMENT");
        setStatus("DRAFT");
        setPriority("NORMAL");
        setOwnerId("");
        setStartDate("");
        setTargetDate("");
      }

      setNotice(mode === "create" ? "Projet créé." : "Modifications enregistrées.");
      router.refresh();
    } catch {
      setError("Impossible de joindre le serveur. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="form-stack">
      {showHeader && <h2 className="panel-title">{mode === "create" ? "Nouveau projet" : "Modifier le projet"}</h2>}
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Cadre du projet</h3>
        </div>
        <div>
          <label className="field-label" htmlFor="project-title">Titre</label>
          <input id="project-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Refonte du poste de travail"
            required
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="project-description">Description</label>
          <textarea id="project-description"
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
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="field-label" htmlFor="project-type">Type</label>
            <select id="project-type" value={type} onChange={(e) => setType(e.target.value as (typeof PROJECT_TYPES)[number])} className="field-select">
              {PROJECT_TYPES.map((item) => (
                <option key={item} value={item}>{projectTypeLabels[item]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="project-status">Statut</label>
            <select id="project-status" value={status} onChange={(e) => setStatus(e.target.value as (typeof PROJECT_STATUSES)[number])} className="field-select">
              {PROJECT_STATUSES.map((item) => (
                <option key={item} value={item}>{projectLabels[item]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="project-priority">Priorité</label>
            <select id="project-priority" value={priority} onChange={(e) => setPriority(e.target.value as (typeof PRIORITIES)[number])} className="field-select">
              {PRIORITIES.map((item) => (
                <option key={item} value={item}>{priorityLabels[item]}</option>
              ))}
            </select>
          </div>
        </div>
        {owners && (
          <label className="block">
            <span className="field-label">Responsable du projet</span>
            <select className="field-select" value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
              <option value="">À attribuer</option>
              {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
            </select>
          </label>
        )}
      </section>
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Dates</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="project-start">Début</label>
            <input id="project-start"
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="project-target">Date cible</label>
            <input id="project-target"
              type="datetime-local"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="field-input"
            />
          </div>
        </div>
      </section>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-800">{notice}</p>}
      <div className="form-actions sm:justify-end">
        <button disabled={loading} className="button-primary">
          {loading ? (mode === "create" ? "Création..." : "Enregistrement...") : mode === "create" ? "Créer le projet" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
