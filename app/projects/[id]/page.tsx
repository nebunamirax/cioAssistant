import { storeMilestone } from "../mutations";
import { actionLabels, decisionStatusLabels, priorityLabels, projectLabels, projectTypeLabels, riskStatusLabels } from "@/lib/domain/display-labels";
import { ACTION_STATUSES } from "@/lib/domain/constants";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { getProjectById } from "@/lib/services/project-service";
import { ExternalProjectTracking } from "@/components/pilotage/external-project-tracking";
import { notFound } from "next/navigation";
import { listDecisions } from "@/lib/services/decision-service";
import { listRisks } from "@/lib/services/risk-service";
import { pilotageDate } from "@/lib/services/pilotage-service";

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(value) : "—";
}

export default async function ProjectDetailPage({ params: paramsPromise, searchParams: searchParamsPromise }: { params: Promise<{ id: string }>; searchParams?: Promise<{ source?: string; status?: string }> }) {
  const params = await paramsPromise;
  const searchParams = await searchParamsPromise;
  const [project, owners, decisions, risks, blocked] = await Promise.all([
    getProjectById(params.id),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    listDecisions({ projectId: params.id }),
    listRisks({ projectId: params.id }),
    prisma.action.findFirst({ where: { projectId: params.id, status: "BLOCKED" },
      select: { id: true, title: true }, orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { id: "asc" }] })
  ]);

  if (!project) return notFound();
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris", dateStyle: "short" }).format(new Date());
  const nextMilestone = project.milestones.find((item) => item.status !== "DONE" && item.dueDate && item.dueDate.toISOString().slice(0, 10) >= today);
  const owner = owners.find((member) => member.id === project.ownerId);
  const projectQuery = `projectId=${encodeURIComponent(project.id)}`;

  return (
    <div className="space-y-4">
      <header className="workbench-header">
        <div>
          <Link href="/projects" className="pilot-row-link text-sm">← Projets</Link>
          <h1 className="workspace-page-title mt-2 break-words">{project.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="pilot-status" data-status={project.status}>{projectLabels[project.status] ?? project.status}</span>
            <span>{projectTypeLabels[project.type] ?? project.type}</span>
            <span>· Priorité {priorityLabels[project.priority]?.toLocaleLowerCase("fr-FR") ?? project.priority}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href={`/roadmap?project=${encodeURIComponent(project.id)}`} className="button-secondary">Voir le planning</Link>
          <Link href={`/assistant?project=${encodeURIComponent(project.id)}`} className="button-secondary">Analyser un compte rendu</Link>
          <Link href={`/projects?selectedId=${project.id}`} className="button-secondary">Modifier le projet</Link>
          <Link href={`/actions?${projectQuery}&new=1`} className="button-primary">Nouvelle action</Link>
        </div>
      </header>

      <section className="workbench-panel space-y-3" aria-label="Points de suivi du projet">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-slate-600">Responsable</dt><dd className="font-semibold">{owner?.name ?? "À attribuer"}</dd></div>
          <div><dt className="text-slate-600">Date cible</dt><dd className="font-semibold">{pilotageDate(project.targetDate)}</dd></div>
          <div><dt className="text-slate-600">Prochain jalon</dt><dd className="font-semibold">
            {nextMilestone ? <Link href={`#${nextMilestone.id}`} className="pilot-row-link">{nextMilestone.title} · {pilotageDate(nextMilestone.dueDate)}</Link> : <Link href="#jalons" className="pilot-row-link">Planifier un jalon</Link>}
          </dd></div>
          <div><dt className="text-slate-600">Point bloquant</dt><dd className="font-semibold">
            {blocked ? <Link href={`/actions?${projectQuery}&selectedId=${blocked.id}#action-detail`} className="pilot-row-link text-rose-700">{blocked.title}</Link> : "Aucune action bloquée"}
          </dd></div>
        </dl>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-200 pt-3 text-sm" aria-label="Sections du projet">
          <Link href="#actions-liees" className="pilot-row-link">Actions ({project._count.actions})</Link>
          <Link href="#jalons" className="pilot-row-link">Jalons ({project.milestones.length})</Link>
          <Link href="#risques-lies" className="pilot-row-link">Risques ({risks.length})</Link>
          <Link href="#decisions-liees" className="pilot-row-link">Décisions ({decisions.length})</Link>
          <Link href="#resume-projet" className="pilot-row-link">Résumé</Link>
        </nav>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section id="actions-liees" className="workbench-panel">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="panel-title">Actions liées</h2>
            <Link href={`/actions?${projectQuery}`} className="workspace-panel-link">Tout afficher</Link>
          </div>
          <div className="space-y-2 text-sm text-slate-700">
            {project.actions.map((action) => (
              <p key={action.id}>
                <Link href={`/actions?${projectQuery}&selectedId=${encodeURIComponent(action.id)}`} className="pilot-row-link">
                  {action.title}
                </Link>{" "}
                · {actionLabels[action.status] ?? action.status} · {action.owner?.name ?? action.ownerName ?? "Sans responsable"} · {pilotageDate(action.dueDate)}
              </p>
            ))}
            {project.actions.length === 0 && <p className="text-slate-500">Aucune action liée.</p>}
          </div>
        </section>

        <section id="decisions-lies" className="workbench-panel space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="panel-title">Décisions liées</h2>
            <Link href={`/decisions?${projectQuery}#nouvelle-decision`} className="button-secondary">Créer une décision</Link>
          </div>
          {decisions.map((decision) => <p key={decision.id} className="text-sm text-slate-700">
            <Link href={`/decisions?${projectQuery}#${encodeURIComponent(decision.id)}`} className="pilot-row-link">{decision.subject}</Link>
            {" · "}{decisionStatusLabels[decision.status as keyof typeof decisionStatusLabels] ?? decision.status} · {decision.decider ?? "Sans décideur"} · {pilotageDate(decision.targetDate)}
          </p>)}
          {!decisions.length && <p className="text-sm text-slate-500">Aucune décision liée.</p>}
        </section>

        <section id="risques-lies" className="workbench-panel space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="panel-title">Risques liés</h2>
            <Link href={`/risks?${projectQuery}#nouveau-risque`} className="button-secondary">Créer un risque</Link>
          </div>
          {risks.map((risk) => <p key={risk.id} className="text-sm text-slate-700">
            <Link href={`/risks?${projectQuery}#${encodeURIComponent(risk.id)}`} className="pilot-row-link">{risk.title}</Link>
            {" · "}{riskStatusLabels[risk.status as keyof typeof riskStatusLabels] ?? risk.status} · {risk.ownerName ?? "Sans responsable"} · {pilotageDate(risk.dueDate)}
          </p>)}
          {!risks.length && <p className="text-sm text-slate-500">Aucun risque lié.</p>}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">E-mails liés</h2>
          <div className="mb-4 space-y-2 text-sm">
            {project.emails.map((email) => <p key={email.id}><Link className="pilot-row-link" href={`/emails?selectedId=${email.id}`}>{email.subject}</Link></p>)}
            <Link href={`/emails?projectId=${project.id}`} className="pilot-row-link">Voir les e-mails du projet</Link>
          </div>
          <h2 id="contrats-lies" className="mb-3 font-semibold">Contrats liés</h2>
          <div className="space-y-2 text-sm text-slate-700">
            {project.contracts.map((contract) => (
              <p key={contract.id}>
                {contract.title} · {contract.status}
              </p>
            ))}
            {project.contracts.length === 0 && <p className="text-slate-500">Aucun contrat lié.</p>}
          </div>
        </section>
      </div>
      <section className="workbench-panel space-y-3" id="jalons">
        <h2 className="panel-title">Jalons</h2>
        {[...project.milestones, null].map((milestone) => <details key={milestone?.id ?? "new"} id={milestone?.id} className="border-t border-slate-200 py-2">
          <summary className="cursor-pointer text-sm font-semibold">
            {milestone ? <>{milestone.title}<span className="ml-2 font-normal text-slate-600">{pilotageDate(milestone.dueDate)} · {actionLabels[milestone.status] ?? milestone.status}</span></> : "Ajouter un jalon"}
          </summary>
          <form action={storeMilestone} className="mt-3 grid items-end gap-2 sm:grid-cols-4">
            {milestone && <input type="hidden" name="id" value={milestone.id} />}
            <input type="hidden" name="projectId" value={project.id} />
            <label className="field-label">Intitulé<input className="field-input" name="title" defaultValue={milestone?.title} required minLength={3} maxLength={160} /></label>
            <label className="field-label">Échéance<input className="field-input" type="date" name="dueDate" defaultValue={milestone?.dueDate?.toISOString().slice(0, 10)} /></label>
            <label className="field-label">Statut<select className="field-select" name="status" defaultValue={milestone?.status ?? "TODO"}>{ACTION_STATUSES.map((status) => <option key={status} value={status}>{actionLabels[status]}</option>)}</select></label>
            <button className="button-secondary">{milestone ? "Enregistrer le jalon" : "Créer le jalon"}</button>
          </form>
        </details>)}
      </section>
      <ExternalProjectTracking projectId={project.id} source={searchParams?.source} status={searchParams?.status} />

      <div id="resume-projet" className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]">
        <section className="workbench-panel space-y-3">
          <h2 className="panel-title">Résumé</h2>
          <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{project.description || "Aucune description."}</p>
          <dl className="border-t border-slate-200 pt-3 text-sm">
            <div><dt className="text-slate-600">Début</dt><dd className="font-medium">{formatDate(project.startDate)}</dd></div>
          </dl>
        </section>
        <section className="workbench-panel space-y-2 text-sm text-slate-700">
          <h2 className="panel-title">Suivi</h2>
          <p><strong>Objectif stratégique</strong> {project.objective ? <Link className="pilot-row-link" href={`/strategy#${project.objective.id}`}>{project.objective.title}</Link> : <Link className="pilot-row-link" href="/strategy">Rattacher à un objectif</Link>}</p>
          <p><Link href="#actions-liees" className="pilot-row-link">{project._count.actions} actions</Link></p>
          <p><Link href="#contrats-lies" className="pilot-row-link">{project._count.contracts} contrats</Link></p>
          <p><strong>Budget:</strong> {project._count.budgetItems}</p>
          <p><strong>Communications:</strong> {project._count.communications}</p>
          <p><strong>Réunions:</strong> {project._count.meetingNotes}</p>
          <p><strong>Créé le:</strong> {formatDate(project.createdAt)}</p>
          <p><strong>Mis à jour le:</strong> {formatDate(project.updatedAt)}</p>
        </section>
      </div>
    </div>
  );
}
