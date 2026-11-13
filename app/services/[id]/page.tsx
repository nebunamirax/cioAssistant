import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { controlState, staleSync } from "@/lib/services/support-service";
import { externalStatusLabel } from "@/lib/domain/external-tracking";
import { ServiceForm } from "../service-form";
import { createFollowUp } from "../mutations";

const date = (value: Date | null) => value ? new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short" }).format(value) : "—";

export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const member = await requireMember();
  const { id } = await params;
  const service = await prisma.supportService.findUnique({ where: { id }, include: {
    owner: { select: { name: true } }, vendor: true, contract: true,
    controls: { orderBy: [{ checkedAt: "desc" }, { createdAt: "desc" }] },
    externalSources: { include: { items: { include: { followUp: { select: { id: true } } }, orderBy: { title: "asc" } } } }
  } });
  if (!service) notFound();
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date());
  return <div className="space-y-4">
    <header className="workbench-header">
      <div><Link href="/services" className="pilot-row-link">Services</Link><h1 className="text-2xl font-semibold">{service.title}</h1><p>{controlState(service.controls[0]).join(" · ")}</p></div>
      <form action={createFollowUp}><input type="hidden" name="serviceId" value={id} /><button className="button-primary">Créer une relance</button></form>
    </header>
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="workbench-panel space-y-2">
        <h2 className="panel-title">Fiche service</h2>
        {[[ "Responsable", service.owner?.name ], [ "Criticité", service.criticality ], [ "Prestataire", service.vendor?.name ], [ "Contrat", service.contract?.title ], [ "Périmètre", service.scope ], [ "Contact d’escalade", service.escalationContact ], [ "Procédure", service.procedure ], [ "Notes", service.notes ]].map(([label, value]) =>
          <div key={label}><strong>{label}</strong><p className="whitespace-pre-wrap">{value ?? "—"}</p></div>)}
      </section>
      <section className="workbench-panel space-y-3">
        <h2 className="panel-title">Contrôles</h2>
        <form method="post" action={`/api/services/${id}/controls`} className="space-y-2">
          <label className="field-label">Date du contrôle<input className="field-input" name="checkedAt" type="date" required defaultValue={today} /></label>
          <label className="field-label">Résultat<select className="field-select" name="result"><option value="OK">Conforme</option><option value="ANOMALY">Anomalie</option></select></label>
          <label className="field-label">Preuve<textarea className="field-textarea" name="evidence" required maxLength={5000} /></label>
          <label className="field-label">Prochaine échéance<input className="field-input" name="nextDueAt" type="date" required /></label>
          <button className="button-primary">Enregistrer le contrôle</button>
        </form>
        {service.controls.map((control) => <article className="border-t pt-2" id={control.id} key={control.id}>
          <strong>{date(control.checkedAt)} · {control.authorName} · {control.result === "OK" ? "Conforme" : "Anomalie"}</strong>
          <p className="whitespace-pre-wrap">{control.evidence}</p><p>Prochaine échéance {date(control.nextDueAt)}</p>
        </article>)}
      </section>
    </div>
    {member.role === "DSI" && <details className="workbench-panel"><summary className="cursor-pointer font-semibold">Modifier la fiche</summary><ServiceForm service={service} /></details>}
    <section className="workbench-panel space-y-4">
      <div className="flex flex-wrap justify-between"><h2 className="panel-title">Tickets prestataires</h2>{member.role === "DSI" && <Link className="pilot-row-link" href={`/settings/integrations?serviceId=${id}`}>Importer un CSV</Link>}</div>
      {service.externalSources.map((source) => <div key={source.id}>
        <h3 className="font-semibold">{source.title} · Importé le {date(source.lastSyncedAt)} {staleSync(source.lastSyncedAt) && "· Données anciennes"}</h3>
        {source.items.map((item) => <article key={item.id} id={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-2">
          <div>{item.url ? <a className="pilot-row-link" href={item.url} rel="noreferrer">{item.externalId} · {item.title}</a> : <p>{item.externalId} · {item.title}</p>}
            <p className="text-sm">{externalStatusLabel(item.status)} {item.major && "· Majeur"} · Échéance {date(item.dueDate)} · Vu le {date(item.lastSyncedAt)} {staleSync(item.lastSyncedAt) && "· Données anciennes"}</p></div>
          {item.followUp ? <Link className="button-secondary" href={`/actions?selectedId=${item.followUp.id}`}>Voir la relance</Link> :
            <form action={createFollowUp}><input type="hidden" name="ticketId" value={item.id} /><button className="button-secondary">Relancer</button></form>}
        </article>)}
      </div>)}
      {!service.externalSources.length && <p>Aucun export importé.</p>}
    </section>
  </div>;
}
