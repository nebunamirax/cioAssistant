"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
};

export function ActionForm({ mode = "create", actionId, initialValues }: ActionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [dueDate, setDueDate] = useState(initialValues?.dueDate ?? "");
  const [status, setStatus] = useState<(typeof ACTION_STATUSES)[number]>(initialValues?.status ?? "TODO");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>(initialValues?.priority ?? "NORMAL");

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
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="font-semibold">{mode === "create" ? "Nouvelle action" : "Modifier l'action"}</h2>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre"
        required
        className="w-full rounded border border-slate-300 px-3 py-2"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        rows={4}
        className="w-full rounded border border-slate-300 px-3 py-2"
      />
      <div className="grid gap-3 md:grid-cols-2">
        <select value={status} onChange={(e) => setStatus(e.target.value as (typeof ACTION_STATUSES)[number])} className="rounded border border-slate-300 px-3 py-2">
          {ACTION_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value as (typeof PRIORITIES)[number])} className="rounded border border-slate-300 px-3 py-2">
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <input
        type="datetime-local"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="w-full rounded border border-slate-300 px-3 py-2"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={loading} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
        {loading ? (mode === "create" ? "Création..." : "Enregistrement...") : mode === "create" ? "Créer" : "Enregistrer"}
      </button>
    </form>
  );
}
