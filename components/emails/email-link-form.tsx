"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Option = {
  id: string;
  label: string;
};

type EmailLinkFormProps = {
  emailId: string;
  projectOptions: Option[];
  actionOptions: Option[];
  initialProjectId?: string | null;
  initialActionId?: string | null;
};

export function EmailLinkForm({
  emailId,
  projectOptions,
  actionOptions,
  initialProjectId,
  initialActionId
}: EmailLinkFormProps) {
  const router = useRouter();
  const [linkedProjectId, setLinkedProjectId] = useState(initialProjectId ?? "");
  const [linkedActionId, setLinkedActionId] = useState(initialActionId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLinkedProjectId(initialProjectId ?? "");
    setLinkedActionId(initialActionId ?? "");
  }, [emailId, initialActionId, initialProjectId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/emails/${emailId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        linkedProjectId,
        linkedActionId
      })
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Impossible de mettre a jour l'email.");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="form-stack">
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Rattachement</h3>
          <p className="form-section-caption">Associe l'email a un projet ou une action deja suivie dans le cockpit.</p>
        </div>
        <label>
          <span className="field-label">Projet lie</span>
          <select value={linkedProjectId} onChange={(event) => setLinkedProjectId(event.target.value)} className="field-select">
            <option value="">Aucun projet</option>
            {projectOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label">Action liee</span>
          <select value={linkedActionId} onChange={(event) => setLinkedActionId(event.target.value)} className="field-select">
            <option value="">Aucune action</option>
            {actionOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>
      </section>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="flex justify-end">
        <button type="submit" className="button-primary" disabled={loading}>
          {loading ? "Enregistrement..." : "Enregistrer le rattachement"}
        </button>
      </div>
    </form>
  );
}
