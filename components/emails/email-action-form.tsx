"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function EmailActionForm({ emailId, subject, projectId, projects }: {
  emailId: string;
  subject: string;
  projectId: string | null;
  projects: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      if (typeof values.dueDate === "string" && values.dueDate) values.dueDate = new Date(values.dueDate).toISOString();
      const response = await fetch(`/api/emails/${emailId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      router.push(`/actions?selectedId=${payload.data.id}`);
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Création impossible.");
    } finally {
      setPending(false);
    }
  }

  return (
    <details className="rounded-lg border border-violet-200 bg-violet-50 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-violet-900">Créer une action</summary>
      <form className="mt-3 grid gap-3" onSubmit={submit}>
        <label><span className="field-label">Titre</span><input name="title" required minLength={3} maxLength={240} defaultValue={subject.slice(0, 240)} className="field-input" /></label>
        <label><span className="field-label">Projet</span><select name="projectId" className="field-select" defaultValue={projectId ?? ""}><option value="">Sans projet</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.label}</option>)}</select></label>
        <label><span className="field-label">Responsable</span><input name="ownerName" maxLength={120} className="field-input" /></label>
        <label><span className="field-label">Échéance</span><input name="dueDate" type="datetime-local" className="field-input" /></label>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <button type="submit" className="button-primary justify-self-start" disabled={pending}>{pending ? "Création…" : "Créer et ouvrir l’action"}</button>
      </form>
    </details>
  );
}
