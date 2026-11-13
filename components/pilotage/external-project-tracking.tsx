import { createFollowUp } from "@/app/services/mutations";
import { staleSync } from "@/lib/services/support-service";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { externalSourceLabel, externalStatusLabel, externalStatuses } from "@/lib/domain/external-tracking";
import { listProjectExternalItems } from "@/lib/services/external-tracking-service";
import { pilotageDate } from "@/lib/services/pilotage-service";

export async function ExternalProjectTracking({ projectId, source, status }: { projectId: string; source?: string; status?: string }) {
  const sources = await prisma.externalSource.findMany({ where: { projectId }, orderBy: { title: "asc" } });
  const sourceId = sources.find((item) => item.id === source)?.id;
  const selectedStatus = externalStatuses.find((item) => item === status);
  const items = await listProjectExternalItems(projectId, sourceId, selectedStatus);
  const now = new Date();

  return (
    <section id="external-tracking" className="pilot-panel overflow-hidden">
      <div className="pilot-panel-heading">
        <div><h2>Suivi externe</h2><p>Tâches Planner et tickets rattachés à ce projet</p></div>
        <Link className="button-secondary" href={`/settings/integrations?projectId=${projectId}`}>Gérer les sources</Link>
      </div>
      {sources.length > 0 && (
        <form action={`/projects/${projectId}#external-tracking`} className="grid items-end gap-2 px-5 pb-4 sm:grid-cols-[1fr_1fr_auto]">
          <label><span className="field-label">Source</span><select name="source" defaultValue={sourceId ?? ""} className="field-select">
            <option value="">Toutes les sources</option>{sources.map((item) => <option key={item.id} value={item.id}>{externalSourceLabel(item.kind)} · {item.title}</option>)}
          </select></label>
          <label><span className="field-label">Statut</span><select name="status" defaultValue={selectedStatus ?? ""} className="field-select">
            <option value="">Tous les statuts</option>{externalStatuses.map((item) => <option key={item} value={item}>{externalStatusLabel(item)}</option>)}
          </select></label>
          <button className="button-secondary">Filtrer</button>
        </form>
      )}
      {items.length ? (
        <div className="overflow-x-auto">
          <table className="pilot-table">
            <thead><tr><th>Élément</th><th>Source</th><th>Statut</th><th>Responsables</th><th>Priorité</th><th>Échéance</th><th>Actualisé</th></tr></thead>
            <tbody>{items.map((item) => (
              <tr key={item.id} id={item.id}>
                <td>
                  {item.url ? <a className="pilot-row-link" href={item.url} target="_blank" rel="noreferrer">{item.title} ↗</a> : <span className="font-medium">{item.title}</span>}
                  <p className="mt-1 break-all text-xs text-slate-500">{item.externalId}</p>
                </td>
                <td>{externalSourceLabel(item.source.kind)}<p className="mt-1 text-xs text-slate-500">{item.source.title} · {pilotageDate(item.source.lastSyncedAt)} {staleSync(item.source.lastSyncedAt, now) && "· Source ancienne"}</p></td>
                <td>
                  <span className="pilot-status" data-status={item.status === "BLOCKED" ? "CANCELLED" : item.status === "DONE" ? "COMPLETED" : undefined}>{externalStatusLabel(item.status)}</span>
                  {item.originalStatus && <p className="mt-1 text-xs text-slate-600">{item.originalStatus}</p>}
                </td>
                <td>{item.assignees || "—"}</td>
                <td>{item.priority || "—"} {item.major && "· Majeur"}</td>
                <td className="whitespace-nowrap">{pilotageDate(item.dueDate)}
                  {item.status !== "DONE" && item.dueDate && item.dueDate < now && <p className="mt-1 text-xs font-medium text-rose-700">En retard</p>}
                </td>
                <td className="whitespace-nowrap">{pilotageDate(item.lastSyncedAt)} {staleSync(item.lastSyncedAt, now) && "· Données anciennes"}
                  {item.source.kind === "TICKET_CSV" && (item.followUp ? <p><Link href={`/actions?selectedId=${item.followUp.id}`}>Voir la relance</Link></p> :
                    <form action={createFollowUp}><input type="hidden" name="ticketId" value={item.id} /><button className="button-secondary">Relancer</button></form>)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <p className="px-5 pb-5 text-sm text-slate-600">{sources.length ? "Aucun élément pour ces filtres." : "Aucune source rattachée."}</p>}
    </section>
  );
}
