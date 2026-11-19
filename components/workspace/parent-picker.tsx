"use client";

import { useEffect, useState } from "react";

export function ParentPicker({ id, parent, value, onChange }: {
  id: string; parent: { id: string; title: string } | null; value: string; onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [pages, setPages] = useState<{ id: string; title: string }[]>(parent ? [parent] : []);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/workspace/pages?" + new URLSearchParams({ query, limit: "30" }), { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error("Recherche indisponible.");
        const found = result.data.items.filter((item: { id: string }) => item.id !== id);
        setPages(parent && !found.some((item: { id: string }) => item.id === parent.id) ? [parent, ...found] : found);
        setError("");
      } catch {
        if (!controller.signal.aborted) setError("Recherche indisponible.");
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, id, parent]);
  return <div className="mt-4 space-y-3">
    <label className="field-label">Rechercher une page parente<input className="field-input mt-1" type="search" maxLength={250} value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    <label className="field-label">Ranger sous<select className="field-select mt-1" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Pages principales</option>
      {value && !pages.some((page) => page.id === value) && <option value={value}>Page sélectionnée</option>}
      {pages.map((page) => <option key={page.id} value={page.id}>{page.title}</option>)}
    </select></label>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
  </div>;
}
