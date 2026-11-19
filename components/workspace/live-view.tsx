"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { actionLabels, projectLabels, riskStatusLabels, decisionStatusLabels, priorityLabels } from "@/lib/domain/display-labels";
import type { WorkspaceView } from "@/lib/validation/workspace";

type Item = { id: string; title: string; status: string; priority: string; date: string | null; url: string };
type Result = { view: WorkspaceView; total: number; items: Item[]; nextCursor: string | null };
const statusLabels: Record<string, Record<string, string>> = {
  action: actionLabels, project: projectLabels, risk: riskStatusLabels, decision: decisionStatusLabels,
  contract: { DRAFT: "Brouillon", ACTIVE: "Actif", EXPIRED: "Expiré", TERMINATED: "Résilié" }
};

export function LiveWorkspaceView({ pageId, view }: { pageId: string; view: WorkspaceView }) {
  const labels = statusLabels[view.entity] ?? {};
  const [data, setData] = useState<Result>();
  const [cursor, setCursor] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let generation = 0;
    async function load() {
      if (document.hidden) return;
      const current = ++generation;
      try {
        const params = new URLSearchParams({ limit: "30", ...(cursor ? { cursor } : {}) });
        const response = await fetch(`/api/workspace/pages/${pageId}/views/${view.id}?${params}`, { signal: controller.signal, cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Chargement impossible.");
        if (current === generation) { setData(result.data); setError(""); }
      } catch (reason) {
        if (!controller.signal.aborted && current === generation) setError(reason instanceof Error ? reason.message : "Chargement impossible.");
      }
    }
    void load();
    const interval = setInterval(() => { void load(); }, 30000);
    return () => { controller.abort(); clearInterval(interval); };
  }, [pageId, view.id, cursor, refresh]);

  const groups = new Map<string, Item[]>();
  for (const item of data?.items ?? []) groups.set(item.status, [...(groups.get(item.status) ?? []), item]);
  return <section className="pilot-panel min-w-0">
    <div className="workspace-panel-heading">
      <div><h2>{view.title}</h2>{data && <p className="mt-1 text-xs text-slate-500">{data.total} fiche{data.total > 1 ? "s" : ""}</p>}</div>
      <button className="button-secondary" type="button" onClick={() => setRefresh((value) => value + 1)}>Actualiser</button>
    </div>
    {error && <p role="alert" className="p-4 text-sm text-rose-700">{error}</p>}
    {!data && !error && <p className="p-4 text-sm text-slate-500">Chargement des fiches…</p>}
    {data?.items.length === 0 && <p className="p-4 text-sm text-slate-500">Aucune fiche pour cette vue.</p>}
    {data && view.layout === "kanban" ? <div className="workspace-linked-kanban">
      {[...groups].map(([status, items]) => <div key={status} className="min-w-56 flex-1 rounded-xl bg-slate-50 p-3">
        <h3 className="mb-3 text-sm font-semibold">{labels[status] || status || "Sans statut"}</h3>
        <ul className="space-y-2">{items.map((item) => <li key={item.id}><Link className="block rounded-lg border border-slate-200 bg-white p-3 text-sm" href={item.url}>{item.title}</Link></li>)}</ul>
      </div>)}
    </div> : data && <div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="border-b border-slate-200 text-xs text-slate-500"><tr><th className="p-3">Fiche</th><th className="p-3">Statut</th><th className="p-3">Priorité</th><th className="p-3">Échéance</th></tr></thead>
      <tbody>{data.items.map((item) => <tr key={item.id} className="border-b border-slate-100">
        <td className="p-3"><Link href={item.url} className="font-medium text-blue-800">{item.title}</Link></td>
        <td className="p-3">{labels[item.status] || item.status || "—"}</td>
        <td className="p-3">{priorityLabels[item.priority] || item.priority || "—"}</td>
        <td className="whitespace-nowrap p-3">{item.date ? new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris" }).format(new Date(item.date)) : "—"}</td>
      </tr>)}</tbody>
    </table></div>}
    {(cursor || data?.nextCursor) && <div className="flex gap-2 p-3">
      {cursor && <button type="button" className="button-secondary" onClick={() => setCursor("")}>Première page</button>}
      {data?.nextCursor && <button type="button" className="button-secondary" onClick={() => setCursor(data.nextCursor ?? "")}>Fiches suivantes</button>}
    </div>}
  </section>;
}
