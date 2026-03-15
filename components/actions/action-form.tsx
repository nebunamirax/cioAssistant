"use client";

import { useState } from "react";

const priorities = ["LOW", "NORMAL", "HIGH", "CRITICAL"] as const;
const statuses = ["TODO", "IN_PROGRESS", "BLOCKED", "WAITING", "DONE"] as const;

export function ActionForm() {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<(typeof statuses)[number]>("TODO");
  const [priority, setPriority] = useState<(typeof priorities)[number]>("NORMAL");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, status, priority })
    });
    setTitle("");
    setLoading(false);
    location.reload();
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="font-semibold">Nouvelle action</h2>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre"
        required
        className="w-full rounded border border-slate-300 px-3 py-2"
      />
      <div className="grid gap-3 md:grid-cols-2">
        <select value={status} onChange={(e) => setStatus(e.target.value as (typeof statuses)[number])} className="rounded border border-slate-300 px-3 py-2">
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value as (typeof priorities)[number])} className="rounded border border-slate-300 px-3 py-2">
          {priorities.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <button disabled={loading} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
        {loading ? "Création..." : "Créer"}
      </button>
    </form>
  );
}
