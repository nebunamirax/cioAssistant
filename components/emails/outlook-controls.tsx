"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type OutlookControlsProps = {
  configured: boolean;
  connected: boolean;
  accountEmail?: string | null;
  lastSyncedAt?: string | null;
  pollingEnabled: boolean;
  pollingIntervalMinutes: number;
  automationEnabled: boolean;
  automationCategory: string;
};

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Jamais";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function OutlookControls({
  configured,
  connected,
  accountEmail,
  lastSyncedAt,
  pollingEnabled,
  pollingIntervalMinutes,
  automationEnabled,
  automationCategory
}: OutlookControlsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"sync" | "disconnect" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const callbackUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return "/api/integrations/outlook/callback";
    }

    return `${window.location.origin}/api/integrations/outlook/callback`;
  }, []);

  const sync = async () => {
    setLoading("sync");
    setError(null);

    const response = await fetch("/api/integrations/outlook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action: "sync" })
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Impossible de synchroniser Outlook.");
      setLoading(null);
      return;
    }

    setLoading(null);
    router.refresh();
  };

  const disconnect = async () => {
    setLoading("disconnect");
    setError(null);

    const response = await fetch("/api/integrations/outlook", {
      method: "DELETE"
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Impossible de deconnecter Outlook.");
      setLoading(null);
      return;
    }

    setLoading(null);
    router.refresh();
  };

  return (
    <section className="workbench-panel space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="panel-title">Microsoft 365</h2>
          <p className="panel-caption">Connexion Outlook deleguee, lecture Inbox et synchro manuelle via Microsoft Graph.</p>
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
          {connected ? `Connecte${accountEmail ? `: ${accountEmail}` : ""}` : configured ? "Pret a connecter" : "Configuration incomplete"}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Etat</div>
          <div className="mt-1 text-sm font-semibold text-slate-950">{connected ? "Connexion active" : "Hors ligne"}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Derniere synchro</div>
          <div className="mt-1 text-sm font-semibold text-slate-950">{formatDateTime(lastSyncedAt)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Callback a declarer</div>
          <div className="mt-1 break-all text-xs text-slate-700">{callbackUrl}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <p>
          <strong>Polling:</strong> {pollingEnabled ? `actif toutes les ${pollingIntervalMinutes} min` : "desactive"}
        </p>
        <p className="mt-1">
          <strong>Extraction auto:</strong> {automationEnabled ? `active sur la categorie "${automationCategory || "non renseignee"}"` : "desactivee"}
        </p>
      </div>

      {!configured ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Renseigne d'abord `tenant ID`, `client ID` et `client secret` dans Parametres &gt; Integrations.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!connected ? (
          <a href="/api/integrations/outlook/start?returnTo=/emails" className="button-primary">
            Connecter Outlook
          </a>
        ) : (
          <>
            <button type="button" onClick={sync} className="button-primary" disabled={loading !== null}>
              {loading === "sync" ? "Synchronisation..." : "Synchroniser la boite"}
            </button>
            <button type="button" onClick={disconnect} className="button-secondary" disabled={loading !== null}>
              {loading === "disconnect" ? "Deconnexion..." : "Deconnecter"}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
