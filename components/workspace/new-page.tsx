"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function NewWorkspacePage({ parentId }: { parentId?: string }) {
  const router = useRouter();
  const key = useRef("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return <form className="workbench-panel h-fit space-y-3" onSubmit={async (event) => {
    event.preventDefault();
    const title = String(new FormData(event.currentTarget).get("title") ?? "");
    key.current ||= crypto.randomUUID();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/workspace/pages", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.current, fields: { title, parentId: parentId ?? null } }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Création impossible.");
      router.push(`/workspace/${result.data.id}`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Création impossible.");
    } finally {
      setPending(false);
    }
  }}>
    <h2 className="panel-title">{parentId ? "Nouvelle sous-page" : "Nouvelle page"}</h2>
    <label className="field-label">Titre<input name="title" required maxLength={250} className="field-input mt-1" onChange={() => { key.current = ""; }} /></label>
    <button className="button-primary" disabled={pending}>{pending ? "Création…" : "Créer la page"}</button>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
  </form>;
}
