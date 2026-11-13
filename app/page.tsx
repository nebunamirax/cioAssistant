import Link from "next/link";
import { Portfolio } from "@/components/pilotage/portfolio";
import { WorkspaceIcon, type WorkspaceIconName } from "@/components/ui/workspace-icon";
import { prisma } from "@/lib/db/prisma";
import { actionLabels, getPortfolio, pilotageDate } from "@/lib/services/pilotage-service";
import { externalSourceLabel } from "@/lib/domain/external-tracking";
import { externalAttentionLabel, listExternalAttention } from "@/lib/services/external-tracking-service";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const now = new Date();
  const openActions = { not: "DONE" };
  const actionContext = { project: { select: { title: true } }, owner: { select: { name: true } } };
  const actionOrder = [{ dueDate: { sort: "asc", nulls: "last" } }, { title: "asc" }] as const;
  const [projects, overdue, blocked, pending, blockedActions, overdueActions, decisions, milestones, externalAttention] = await Promise.all([
    getPortfolio(),
    prisma.action.count({ where: { status: openActions, dueDate: { lt: now } } }),
    prisma.action.count({ where: { status: "BLOCKED" } }),
    prisma.decision.count({ where: { status: "PENDING" } }),
    prisma.action.findMany({ where: { status: "BLOCKED" }, include: actionContext, orderBy: [...actionOrder], take: 5 }),
    prisma.action.findMany({
      where: { status: { notIn: ["DONE", "BLOCKED"] }, dueDate: { lt: now } },
      include: actionContext, orderBy: [...actionOrder], take: 5
    }),
    prisma.decision.findMany({
      where: { status: "PENDING" }, include: { project: { select: { title: true } } },
      orderBy: [{ targetDate: { sort: "asc", nulls: "last" } }, { subject: "asc" }], take: 3
    }),
    prisma.milestone.findMany({
      where: { status: openActions, dueDate: { gte: now }, project: { status: { notIn: ["CANCELLED", "COMPLETED"] } } },
      include: { project: { select: { id: true, title: true } } }, orderBy: [{ dueDate: "asc" }, { title: "asc" }], take: 4
    }),
    listExternalAttention(now, 6)
  ]);
  const active = projects.filter((project) => project.status === "ACTIVE");
  const actions = [...blockedActions, ...overdueActions].slice(0, 5);
  const metrics: { label: string; value: number; href: string; tone: string; icon: WorkspaceIconName }[] = [
    { label: "Actions bloquées", value: blocked, href: "/actions?status=BLOCKED", tone: "rose", icon: "alert" },
    { label: "Actions en retard", value: overdue, href: "/actions?overdueOnly=true", tone: "amber", icon: "calendar" },
    { label: "Arbitrages attendus", value: pending, href: "/decisions?status=PENDING", tone: "violet", icon: "decision" },
    { label: "Projets actifs", value: active.length, href: "/projects?status=ACTIVE", tone: "blue", icon: "folder" }
  ];

  return (
    <div className="workspace-page">
      <header className="workspace-page-heading">
        <div>
          <p className="workspace-date">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeZone: "Europe/Paris" }).format(now)}</p>
          <h1 className="workspace-page-title">Aujourd’hui</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/actions?new=1" className="button-secondary gap-1.5"><WorkspaceIcon name="plus" className="h-4 w-4" /> Nouvelle action</Link>
          <Link href="/assistant" className="button-primary gap-2"><WorkspaceIcon name="sparkles" className="h-4 w-4" /> Analyser un compte rendu</Link>
        </div>
      </header>

      <section className="workspace-metrics" aria-label="Indicateurs de pilotage">
        {metrics.map((metric) => (
          <Link key={metric.href} href={metric.href} className="workspace-metric" data-tone={metric.tone}>
            <span className="workspace-metric-icon"><WorkspaceIcon name={metric.icon} /></span>
            <span className="min-w-0 flex-1">
              <strong className="workspace-metric-value">{metric.value}</strong>
              <span className="workspace-metric-label">{metric.label}</span>
            </span>
            <WorkspaceIcon name="right" className="workspace-metric-arrow h-4 w-4" />
          </Link>
        ))}
      </section>

      <div className="workspace-dashboard-grid">
        <div className="min-w-0 space-y-5">
          <section className="pilot-panel min-w-0">
            <div className="workspace-panel-heading">
              <h2>À traiter en priorité</h2>
              <Link href="/actions" className="workspace-panel-link">Toutes les actions <WorkspaceIcon name="arrow" className="h-4 w-4" /></Link>
            </div>
            {actions.length ? (
              <ul className="workspace-feed">
                {actions.map((action) => {
                  const late = action.dueDate && action.dueDate < now;
                  return (
                    <li key={action.id}>
                      <Link className="workspace-feed-row" href={`/actions?selectedId=${encodeURIComponent(action.id)}`}>
                        <span className="workspace-feed-icon" data-tone={action.status === "BLOCKED" ? "rose" : "amber"}>
                          <WorkspaceIcon name={action.status === "BLOCKED" ? "alert" : "calendar"} className="h-4 w-4" />
                        </span>
                        <span className="workspace-feed-text">
                          <strong>{action.title}</strong>
                          <span>{[action.project?.title ?? "Sans projet", action.owner?.name ?? action.ownerName ?? "Sans responsable"].join(" · ")}</span>
                        </span>
                        <span className="workspace-feed-meta">
                          <span className="pilot-status" data-status={action.status === "BLOCKED" ? "BLOCKED" : "LATE"}>
                            {action.status === "BLOCKED" ? actionLabels.BLOCKED : "En retard"}
                          </span>
                          {action.dueDate && <time dateTime={action.dueDate.toISOString()} className={late ? "text-rose-700" : undefined}>{pilotageDate(action.dueDate)}</time>}
                        </span>
                        <WorkspaceIcon name="right" className="workspace-feed-arrow h-4 w-4" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="workspace-empty">Aucune action bloquée ou en retard.</p>}
          </section>

          <section className="pilot-panel min-w-0">
            <div className="workspace-panel-heading">
              <h2>Projets en cours</h2>
              <Link href="/roadmap" className="workspace-panel-link">Voir la roadmap <WorkspaceIcon name="arrow" className="h-4 w-4" /></Link>
            </div>
            <Portfolio projects={active.slice(0, 5)} />
          </section>
        </div>

        <div className="min-w-0 space-y-5">
          <section className="pilot-panel">
            <div className="workspace-panel-heading"><h2>Arbitrages attendus</h2></div>
            {decisions.length ? (
              <ul className="workspace-feed">
                {decisions.map((decision) => (
                  <li key={decision.id}>
                    <Link className="workspace-feed-row" href={`/decisions?status=PENDING#${encodeURIComponent(decision.id)}`}>
                      <span className="workspace-feed-icon" data-tone="violet"><WorkspaceIcon name="decision" className="h-4 w-4" /></span>
                      <span className="workspace-feed-text">
                        <strong>{decision.subject}</strong>
                        <span>{[decision.project?.title, decision.targetDate ? pilotageDate(decision.targetDate) : "Date à fixer"].filter(Boolean).join(" · ")}</span>
                      </span>
                      <WorkspaceIcon name="right" className="workspace-feed-arrow h-4 w-4" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="workspace-empty">Aucun arbitrage en attente.</p>}
            {pending > decisions.length && <Link href="/decisions?status=PENDING" className="workspace-panel-footer">Tous les arbitrages <WorkspaceIcon name="arrow" className="h-4 w-4" /></Link>}
          </section>

          <section className="pilot-panel">
            <div className="workspace-panel-heading"><h2>Prochains jalons</h2></div>
            {milestones.length ? (
              <ul className="workspace-feed">
                {milestones.map((milestone) => (
                  <li key={milestone.id}>
                    <Link className="workspace-feed-row" href={`/roadmap?project=${encodeURIComponent(milestone.project.id)}&month=${milestone.dueDate?.toISOString().slice(0, 7)}#planning-projet`}>
                      <span className="workspace-feed-icon" data-tone="blue"><WorkspaceIcon name="diamond" className="h-3.5 w-3.5" /></span>
                      <span className="workspace-feed-text">
                        <strong>{milestone.title}</strong>
                        <span>{milestone.project.title} · {pilotageDate(milestone.dueDate)}</span>
                      </span>
                      <WorkspaceIcon name="right" className="workspace-feed-arrow h-4 w-4" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="workspace-empty">Aucun jalon à venir.</p>}
          </section>
          <Link href="/weekly-review" className="workspace-review-link">
            <span className="workspace-feed-icon" data-tone="blue"><WorkspaceIcon name="review" /></span>
            <span className="flex-1">Préparer la revue hebdo</span>
            <WorkspaceIcon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {externalAttention.length > 0 && (
        <section className="pilot-panel">
          <div className="workspace-panel-heading">
            <h2>Alertes externes</h2>
            <Link href="/settings/integrations" className="workspace-panel-link">Intégrations <WorkspaceIcon name="arrow" className="h-4 w-4" /></Link>
          </div>
          <ul className="workspace-feed">
            {externalAttention.map((item) => (
              <li key={item.id} className="workspace-feed-row">
                <span className="workspace-feed-icon" data-tone="amber"><WorkspaceIcon name="alert" className="h-4 w-4" /></span>
                <div className="workspace-feed-text">
                  <strong>{item.title}</strong>
                  <span>{externalSourceLabel(item.source.kind)} · {item.source.title} · {externalAttentionLabel(item, now)} · {pilotageDate(item.dueDate)}</span>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 text-sm">
                  {item.source.project ? <Link className="pilot-row-link" href={`/projects/${item.source.project.id}#external-tracking`}>{item.source.project.title}</Link> :
                    item.source.service && <Link className="pilot-row-link" href={`/services/${item.source.service.id}#${item.id}`}>{item.source.service.title}</Link>}
                  {item.url && <a className="pilot-row-link" href={item.url} target="_blank" rel="noreferrer" aria-label={`Ouvrir ${item.title} à la source`}>Source ↗</a>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
