"use client";

import { actionLabels, priorityLabels } from "@/lib/domain/display-labels";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ACTION_STATUSES, PRIORITIES } from "@/lib/domain/constants";
import { fromDatetimeLocal, toDatetimeLocal } from "@/lib/domain/datetime-local";

type ActionFormValues = {
  title: string;
  description?: string | null;
  ownerId?: string | null;
  ownerName?: string | null;
  status: (typeof ACTION_STATUSES)[number];
  priority: (typeof PRIORITIES)[number];
  dueDate?: string | null;
  projectId?: string | null;
};

type ProjectOption = {
  id: string;
  title: string;
};

type ActionFormProps = {
  mode?: "create" | "edit";
  actionId?: string;
  initialValues?: Partial<ActionFormValues>;
  showHeader?: boolean;
  apprentice?: boolean;
  members?: { id: string; name: string; email: string }[];
  projectOptions?: ProjectOption[];
};

export function ActionForm({ mode = "create", actionId, initialValues, showHeader = true, apprentice = false, members, projectOptions }: ActionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [ownerId, setOwnerId] = useState(initialValues?.ownerId ?? "");
  const [ownerName, setOwnerName] = useState(initialValues?.ownerName ?? "");
  const [initialLocalDueDate, setInitialLocalDueDate] = useState("");
  const [dueDateDraft, setDueDateDraft] = useState<string | null>(null);
  const [status, setStatus] = useState<(typeof ACTION_STATUSES)[number]>(initialValues?.status ?? "TODO");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>(initialValues?.priority ?? "NORMAL");
  const [projectId, setProjectId] = useState(initialValues?.projectId ?? "");
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  useEffect(() => {
    setTitle(initialValues?.title ?? "");
    setDescription(initialValues?.description ?? "");
    setOwnerId(initialValues?.ownerId ?? "");
    setOwnerName(initialValues?.ownerName ?? "");
    // The browser's time zone is available consistently after hydration.
    setInitialLocalDueDate(toDatetimeLocal(initialValues?.dueDate));
    setDueDateDraft(null);
    setStatus(initialValues?.status ?? "TODO");
    setPriority(initialValues?.priority ?? "NORMAL");
    setProjectId(initialValues?.projectId ?? "");
  }, [actionId, initialValues, mode]);

  useEffect(() => {
    if (projectOptions) return;
    let cancelled = false;

    const loadProjects = async () => {
      try {
        const response = await fetch("/api/projects");
        const payload = await response.json();
        if (!response.ok || cancelled) return;

        setProjects(
          Array.isArray(payload.data)
            ? payload.data.map((project: { id: string; title: string }) => ({ id: project.id, title: project.title }))
            : []
        );
      } catch {
        if (!cancelled) setError("Impossible de charger les projets.");
      }
    };

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, [projectOptions]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(actionId ? `/api/actions/${actionId}` : "/api/actions", {
        method: actionId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apprentice && actionId ? { status } : {
          title,
          description,
          ...(members ? { ownerId: ownerId || null } : { ownerName }),
          status,
          priority,
          ...(mode === "create" || (dueDateDraft !== null && dueDateDraft !== initialLocalDueDate)
            ? { dueDate: fromDatetimeLocal(dueDateDraft ?? initialLocalDueDate) }
            : {}),
          projectId: projectId || null
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
        setOwnerName("");
        setOwnerId("");
        setInitialLocalDueDate("");
        setDueDateDraft(null);
        setStatus("TODO");
        setPriority("NORMAL");
        setProjectId(initialValues?.projectId ?? "");
      }

      setNotice(mode === "create" ? "Action créée." : "Modifications enregistrées.");
      router.refresh();
    } catch {
      setError("Impossible de joindre le serveur. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="form-stack">
      {showHeader && <h2 className="panel-title">{mode === "create" ? "Nouvelle action" : "Modifier l'action"}</h2>}
      {!(apprentice && actionId) && <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Action</h3>
        </div>
        <div>
          <label className="field-label" htmlFor="action-title">Titre</label>
          <input id="action-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Valider le budget infra 2026"
            required
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="action-description">Description</label>
          <textarea id="action-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contexte, livrable attendu, point de vigilance..."
            rows={4}
            className="field-textarea"
          />
        </div>
        {!apprentice && <label>
          <span className="field-label">Responsable</span>
          {members ? <select className="field-select" value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
            <option value="">{ownerName || "Sans affectation"}</option>
            {members.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.email}</option>)}
          </select> : <input className="field-input" value={ownerName} onChange={(event) => setOwnerName(event.target.value)} />}
        </label>}
      </section>}
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Pilotage</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="action-status">Statut</label>
            <select id="action-status" value={status} onChange={(e) => setStatus(e.target.value as (typeof ACTION_STATUSES)[number])} className="field-select">
              {ACTION_STATUSES.map((s) => (
                <option key={s} value={s}>{actionLabels[s]}</option>
              ))}
            </select>
          </div>
          <div hidden={Boolean(apprentice && actionId)}>
            <label className="field-label" htmlFor="action-priority">Priorité</label>
            <select id="action-priority" value={priority} onChange={(e) => setPriority(e.target.value as (typeof PRIORITIES)[number])} className="field-select">
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{priorityLabels[p]}</option>
              ))}
            </select>
          </div>
        </div>
        <div hidden={Boolean(apprentice && actionId)}>
          <label className="field-label" htmlFor="action-project">Projet</label>
          <select id="action-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className="field-select">
            <option value="">Aucun projet</option>
            {(projectOptions ?? projects).map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </div>
        <div hidden={Boolean(apprentice && actionId)}>
          <label className="field-label" htmlFor="action-due">Échéance</label>
          <input id="action-due"
            type="datetime-local"
            value={dueDateDraft ?? initialLocalDueDate}
            onChange={(e) => setDueDateDraft(e.target.value)}
            className="field-input"
          />
        </div>
      </section>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-800">{notice}</p>}
      <div className="form-actions sm:justify-end">
        <button disabled={loading} className="button-primary">
          {loading ? (mode === "create" ? "Création..." : "Enregistrement...") : mode === "create" ? "Créer l'action" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
