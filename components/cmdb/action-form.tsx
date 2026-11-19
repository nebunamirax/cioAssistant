"use client";

import { startTransition, useActionState, type ReactNode } from "react";

type FormResult = { error?: string; message?: string };

export function CmdbActionForm({ action, children, className, confirmation }: {
  action: (state: FormResult, form: FormData) => Promise<FormResult>;
  children: ReactNode;
  className?: string;
  confirmation?: string;
}) {
  const [state, dispatch, pending] = useActionState(action, {});
  return (
    <form className={className} onSubmit={(event) => {
      event.preventDefault();
      if (pending || (confirmation && !window.confirm(confirmation))) return;
      const form = new FormData(event.currentTarget);
      startTransition(() => dispatch(form));
    }}>
      <fieldset disabled={pending} className="min-w-0">
        {children}
      </fieldset>
      <div aria-live="polite">
        {pending && <p className="mt-2 text-sm text-slate-600">Enregistrement…</p>}
        {state.error && <p className="mt-2 text-sm font-medium text-red-700">{state.error}</p>}
        {state.message && <p className="mt-2 text-sm font-medium text-emerald-800">{state.message}</p>}
      </div>
    </form>
  );
}
