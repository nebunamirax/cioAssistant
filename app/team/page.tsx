import { requireMember } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { actionLabels, getTeamWork, pilotageDate } from "@/lib/services/pilotage-service";

import { addMember, disableMember } from "./mutations";

export const dynamic = "force-dynamic";

export default async function TeamPage({ searchParams: searchParamsPromise }: { searchParams?: Promise<{ error?: string }> }) {
  const searchParams = await searchParamsPromise;
  const actor = await requireMember("DSI");
  const [team, accounts] = await Promise.all([
    getTeamWork(),
    prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, enabled: true, objectId: true }, orderBy: { name: "asc" } })
  ]);

  return (
    <div className="space-y-5">
      <header className="workbench-header">
        <div><h1 className="text-2xl font-semibold">Équipe</h1></div>
        <Link href="/actions?view=kanban" className="button-primary">Ouvrir le Kanban</Link>
      </header>
      <details className="workbench-panel" open={Boolean(searchParams?.error) || undefined}>
        <summary className="cursor-pointer font-semibold text-violet-800">Ajouter un membre</summary>
        {searchParams?.error && <p role="alert" className="mt-2 text-sm text-rose-700">{searchParams.error === "duplicate" ? "Cette adresse est déjà enregistrée." : "Vérifie le nom et l’adresse e-mail."}</p>}
        <form action={addMember} className="mt-3 grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label><span className="field-label">Nom</span><input name="name" required minLength={2} maxLength={120} className="field-input" /></label>
          <label><span className="field-label">E-mail professionnel</span><input name="email" type="email" required maxLength={254} className="field-input" /></label>
          <label><span className="field-label">ID objet Entra</span><input name="objectId" required className="field-input" /></label>
          <label><span className="field-label">Rôle</span><select name="role" className="field-select"><option value="APPRENTI">Apprenti</option><option value="DSI">DSI</option></select></label>
          <button className="button-primary">Autoriser le membre</button>
        </form>
      </details>
      <details className="workbench-panel">
        <summary className="cursor-pointer font-semibold">Comptes et accès</summary>
        <ul className="mt-3 space-y-2">{accounts.map((account) => <li key={account.id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
          <span>{account.name} · {account.email} · {account.role} · {account.enabled ? "Actif" : "Désactivé"}</span>
          {account.enabled && account.objectId && account.id !== actor.id && <form action={disableMember}>
            <input type="hidden" name="id" value={account.id} />
            <button className="button-secondary">Désactiver</button>
          </form>}
        </li>)}</ul>
      </details>
      {team.length === 0 && <p className="workbench-panel text-sm">Attribue une action pour commencer à suivre les responsabilités.</p>}
      <div className="grid items-start gap-4 xl:grid-cols-2">
        {team.map((member) => (
          <details key={member.key} className="workbench-panel" open={member.actions.length > 0}>
            <summary className="cursor-pointer font-semibold">{member.name}<span className="ml-3 text-sm font-normal text-slate-600">{member.actions.length} ouvertes · {member.overdue} en retard · {member.blocked} bloquées</span></summary>
            <ul className="mt-3 divide-y divide-slate-100">
              {member.actions.map((action) => (
                <li key={action.id} className="py-2">
                  <Link href={`/actions?selectedId=${action.id}`} className="pilot-row-link text-sm">{action.title}</Link>
                  <p className="mt-1 text-xs text-slate-600">{action.project?.title ?? "Sans projet"} · {actionLabels[action.status] ?? action.status} · {pilotageDate(action.dueDate)}</p>
                </li>
              ))}
            </ul>
            {!member.actions.length && <p className="mt-2 text-sm text-slate-600">Aucune action ouverte.</p>}
          </details>
        ))}
      </div>
    </div>
  );
}
