"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type OutlookControlsProps = {
  enabled: boolean;
  configured: boolean;
  connected: boolean;
  accountEmail?: string | null;
  lastSyncedAt?: string | null;
  pollingEnabled: boolean;
  pollingIntervalMinutes: number;
  automationEnabled: boolean;
  automationCategory: string;
};

export function OutlookControls(props: OutlookControlsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"sync" | "disconnect" | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);
  const [callbackUrl, setCallbackUrl] = useState("");
  useEffect(() => setCallbackUrl(`${window.location.origin}/api/integrations/outlook/callback`), []);

  async function changeConnection(action: "sync" | "disconnect") {
    setLoading(action);
    setFeedback(null);
    try {
      const response = await fetch("/api/integrations/outlook", action === "sync" ? {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" })
      } : { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "L’opération Outlook a échoué.");
      setFeedback({ text: action === "sync" ? `${payload.data.syncedCount} e-mails lus lors de la synchronisation.` : "Compte Outlook déconnecté." });
      router.refresh();
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : "L’opération Outlook a échoué.", error: true });
    } finally {
      setLoading(null);
    }
  }

  const lastSync = props.lastSyncedAt ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(props.lastSyncedAt)) : "Jamais";

  return (
    <section className="workbench-panel space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="panel-title">Microsoft 365 <span className="ml-2 text-xs font-medium text-slate-600">{props.connected ? props.accountEmail ?? "Connecté" : "Déconnecté"}</span></h2>
          <p className="mt-1 text-sm text-slate-600">{props.connected ? `Dernière synchronisation · ${lastSync}` : "Synchronise la boîte de réception Outlook."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {props.connected && <button type="button" onClick={() => changeConnection("disconnect")} disabled={loading !== null} className="button-secondary">Déconnecter</button>}
          {props.enabled && props.configured ? (
            props.connected ? <button type="button" onClick={() => changeConnection("sync")} disabled={loading !== null} className="button-primary">{loading === "sync" ? "Synchronisation…" : "Synchroniser"}</button>
              : <a href="/api/integrations/outlook/start?returnTo=/emails" className="button-primary">Connecter Outlook</a>
          ) : <Link href="/settings#outlook-settings" className="button-primary">Configurer Outlook</Link>}
        </div>
      </div>
      {feedback && <p role={feedback.error ? "alert" : "status"} className={`text-sm ${feedback.error ? "text-rose-700" : "text-emerald-800"}`}>{feedback.text}</p>}
      <details className="text-xs text-slate-600">
        <summary className="cursor-pointer">Configuration de la synchronisation</summary>
        <div className="mt-2 space-y-1">
          <p>URI de redirection Microsoft Entra <code className="break-all">{callbackUrl}</code></p>
          <p>{props.pollingEnabled ? `Synchronisation automatique toutes les ${props.pollingIntervalMinutes} min` : "Synchronisation manuelle"}</p>
          <p>{props.automationEnabled ? `Extraction automatique pour la catégorie « ${props.automationCategory} »` : "Extraction automatique désactivée"}</p>
        </div>
      </details>
    </section>
  );
}
