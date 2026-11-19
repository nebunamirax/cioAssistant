"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function ActionNoteForm({ action, saved }: { action: string; saved: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState(saved ? "Note ajoutée." : "");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch(action, { method: "POST", headers: { Accept: "application/json" }, body: data });
      if (!response.ok) {
        setError(response.status === 422 ? "Saisissez une note non vide." : "Impossible d’ajouter la note.");
        return;
      }
      form.reset();
      setNotice("Note ajoutée.");
      router.refresh();
    } catch {
      setError("Connexion indisponible. Réessayez.");
    } finally {
      setPending(false);
    }
  }

  return <form method="post" action={action} onSubmit={submit} className="space-y-2">
    <label className="field-label">Note <textarea className="field-textarea" name="content" required maxLength={5000} readOnly={pending} /></label>
    <button className="button-secondary" disabled={pending}>{pending ? "Ajout en cours…" : "Ajouter la note"}</button>
    <p role="status" className="text-sm text-emerald-700">{notice}</p>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
  </form>;
}
