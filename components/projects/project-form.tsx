"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
};

export function ProjectForm({ mode = "create", projectId, initialValues }: ProjectFormProps) {
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
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="font-semibold">{mode === "create" ? "Nouveau projet" : "Modifier le projet"}</h2>
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
      <div className="grid gap-3 md:grid-cols-3">
        <select value={type} onChange={(e) => setType(e.target.value as (typeof PROJECT_TYPES)[number])} className="rounded border border-slate-300 px-3 py-2">
          {PROJECT_TYPES.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as (typeof PROJECT_STATUSES)[number])} className="rounded border border-slate-300 px-3 py-2">
          {PROJECT_STATUSES.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value as (typeof PRIORITIES)[number])} className="rounded border border-slate-300 px-3 py-2">
          {PRIORITIES.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <input
          type="datetime-local"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full rounded border border-slate-300 px-3 py-2"
        />
        <input
          type="datetime-local"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className="w-full rounded border border-slate-300 px-3 py-2"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={loading} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
        {loading ? (mode === "create" ? "Création..." : "Enregistrement...") : mode === "create" ? "Créer" : "Enregistrer"}
      </button>
    </form>
  );
}
