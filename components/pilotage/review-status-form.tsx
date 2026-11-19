"use client";

import { useActionState, useId } from "react";
import { setReviewStatus } from "@/app/decisions/status-mutation";

export function ReviewStatusForm({ kind, id, status, labels }: {
  kind: "risk" | "decision";
  id: string;
  status: string;
  labels: Record<string, string>;
}) {
  const selectId = useId();
  const [error, submit, pending] = useActionState(setReviewStatus.bind(null, status), "");

  return (
    <form action={submit} className="space-y-1">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <label htmlFor={selectId} className="sr-only">Nouveau statut</label>
      <div className="flex flex-wrap items-center gap-1.5">
        <select id={selectId} key={status} name="status" className="field-select w-auto" defaultValue={status} disabled={pending}>
          {Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
        <button className="button-secondary" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
      </div>
      {error && <p role="alert" className="text-xs text-rose-800">{error}</p>}
    {error === null && <p role="status" className="text-xs text-emerald-800">Statut enregistré.</p>}
    </form>
  );
}
