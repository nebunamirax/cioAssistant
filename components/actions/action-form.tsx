"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ACTION_STATUSES, PRIORITIES } from "@/lib/domain/constants";

type ActionFormValues = {
  title: string;
  description?: string | null;
  status: (typeof ACTION_STATUSES)[number];
  priority: (typeof PRIORITIES)[number];
  dueDate?: string | null;
};

type ActionFormProps = {
  mode?: "create" | "edit";
  actionId?: string;
  initialValues?: Partial<ActionFormValues>;
  showHeader?: boolean;
};

export function ActionForm({ mode = "create", actionId, initialValues, showHeader = true }: ActionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [dueDate, setDueDate] = useState(initialValues?.dueDate ?? "");
  const [status, setStatus] = useState<(typeof ACTION_STATUSES)[number]>(initialValues?.status ?? "TODO");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>(initialValues?.priority ?? "NORMAL");

  useEffect(() => {
    setTitle(initialValues?.title ?? "");
    setDescription(initialValues?.description ?? "");
    setDueDate(initialValues?.dueDate ?? "");
    setStatus(initialValues?.status ?? "TODO");
    setPriority(initialValues?.priority ?? "NORMAL");
  }, [actionId, initialValues, mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch(actionId ? `/api/actions/${actionId}` : "/api/actions", {
      method: actionId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null
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
      setDueDate("");
      setStatus("TODO");
      setPriority("NORMAL");
    }

    setLoading(false);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="form-stack">
      {showHeader && <h2 className="panel-title">{mode === "create" ? "Nouvelle action" : "Modifier l'action"}</h2>}
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Essentiel</h3>
          <p className="form-section-caption">Décris clairement l’action à exécuter. Commence par le résultat attendu.</p>
        </div>
        <div>
          <label className="field-label">Titre</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Valider le budget infra 2026"
            required
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contexte, livrable attendu, point de vigilance..."
            rows={4}
            className="field-textarea"
          />
          <p className="field-hint">Optionnel, mais utile pour transmettre l’intention sans devoir ouvrir une fiche détail.</p>
        </div>
      </section>
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Pilotage</h3>
          <p className="form-section-caption">Positionne l’action dans le flux de travail et fixe son niveau d’attention.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="field-label">Statut</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as (typeof ACTION_STATUSES)[number])} className="field-select">
              {ACTION_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Priorité</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as (typeof PRIORITIES)[number])} className="field-select">
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="field-label">Échéance</label>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="field-input"
          />
          <p className="field-hint">Laisse vide si l’action reste ouverte sans date cible.</p>
        </div>
      </section>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="form-actions">
        <p className="form-actions-note">Les changements sont enregistrés sur l’action sélectionnée.</p>
        <button disabled={loading} className="button-primary">
          {loading ? (mode === "create" ? "Création..." : "Enregistrement...") : mode === "create" ? "Créer l'action" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
