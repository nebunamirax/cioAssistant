import Link from "next/link";
import { requireMember } from "@/lib/auth/session";
import { RoadmapTimeline, type TimelineRow } from "@/components/roadmap/roadmap-timeline";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
import { actionLabels, priorityLabels, projectLabels } from "@/lib/domain/display-labels";
import { pilotageDate } from "@/lib/services/pilotage-service";
import { buildRoadmapMonths, getRoadmapActions, getRoadmapData } from "@/lib/services/roadmap-service";

export const dynamic = "force-dynamic";

const viewStatuses = ["open", "all", "ACTIVE", "DRAFT", "ON_HOLD", "COMPLETED"] as const;
const horizons = [3, 6, 12] as const;
const monthFormat = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
const parisDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris", dateStyle: "short" });

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("fr");
}

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function shiftMonths(date: Date, count: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1));
}

export default async function RoadmapPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [member, params, { projects, unassignedCount }] = await Promise.all([requireMember(), searchParams, getRoadmapData()]);
  const dsi = member.role === "DSI";
  const today = new Date(parisDate.format(new Date()) + "T00:00:00Z");
  const thisQuarter = shiftMonths(today, -(today.getUTCMonth() % 3));
  const anchor = typeof params.month === "string" && /^(19\d{2}|20\d{2}|21\d{2})-(0[1-9]|1[0-2])$/.test(params.month)
    ? new Date(`${params.month}-01T00:00:00Z`) : thisQuarter;
  const horizon = horizons.find((count) => String(count) === params.span) ?? 6;
  const status = viewStatuses.find((item) => item === params.status) ?? "open";
  const search = typeof params.q === "string" ? params.q.trim().slice(0, 120) : "";
  const objective = typeof params.objective === "string" ? params.objective : "";
  const project = projects.find((item) => item.id === params.project);
  const actions = project ? await getRoadmapActions(project.id) : [];
  const months = buildRoadmapMonths(anchor, horizon);
  const objectives = Array.from(new Map(projects.flatMap((item) => item.objective ? [[item.objective.id, item.objective] as const] : [])).values())
    .sort((a, b) => a.title.localeCompare(b.title, "fr"));
  const normalizedSearch = normalizeSearch(search);
  const filtered = projects.filter((item) => {
    const matchesStatus = status === "all" || (status === "open" ? item.status !== "COMPLETED" : item.status === status);
    const matchesSearch = !normalizedSearch || normalizeSearch(`${item.title} ${item.owner?.name ?? ""} ${item.objective?.title ?? ""}`).includes(normalizedSearch);
    return matchesStatus && (!objective || item.objective?.id === objective) && matchesSearch;
  });

  const base = new URLSearchParams({ month: monthKey(anchor), span: String(horizon) });
  if (status !== "open") base.set("status", status);
  if (search) base.set("q", search);
  if (objective) base.set("objective", objective);
  if (project) base.set("project", project.id);

  function roadmapHref(next: Record<string, string | null>) {
    const query = new URLSearchParams(base);
    for (const [key, value] of Object.entries(next)) {
      if (value === null) query.delete(key);
      else query.set(key, value);
    }
    return `/roadmap?${query}`;
  }

  const agenda = params.display === "agenda";
  const calendar = params.display === "calendar";
  if (agenda || calendar) base.set("display", agenda ? "agenda" : "calendar");
  const listHref = roadmapHref({ project: null });
  const actionList = project ? `/actions?projectId=${encodeURIComponent(project.id)}` : "/actions";
  const focusDate = project ? project.targetDate ?? project.startDate ?? project.milestones.find((item) => item.dueDate)?.dueDate ?? actions.find((item) => item.dueDate)?.dueDate : null;
  const rows: TimelineRow[] = project ? [
    ...project.milestones.map((milestone) => ({
      id: milestone.id, title: milestone.title, href: dsi ? `/projects/${encodeURIComponent(project.id)}#${encodeURIComponent(milestone.id)}` : `#${encodeURIComponent(milestone.id)}`,
      kind: "milestone" as const, status: milestone.status, statusLabel: actionLabels[milestone.status] ?? milestone.status, targetDate: milestone.dueDate
    })),
    ...actions.map((action) => ({
      id: action.id, title: action.title, href: `${actionList}&selectedId=${encodeURIComponent(action.id)}`,
      kind: "action" as const, status: action.status, statusLabel: actionLabels[action.status] ?? action.status,
      meta: action.owner?.name ?? action.ownerName ?? undefined, targetDate: action.dueDate
    }))
  ].sort((a, b) => (a.targetDate?.getTime() ?? Infinity) - (b.targetDate?.getTime() ?? Infinity) || a.title.localeCompare(b.title, "fr")) : filtered.map((item) => ({
    id: `projet-${item.id}`, title: item.title, href: roadmapHref({ project: item.id }),
    kind: "project", status: item.status, statusLabel: projectLabels[item.status] ?? item.status, startDate: item.startDate, targetDate: item.targetDate,
    meta: item.owner?.name ?? undefined, milestones: item.milestones
  }));

  return (
    <div className="workspace-page">
      <header className="workspace-page-heading">
        <div className="min-w-0">
          {project && <Link href={listHref} className="workspace-panel-link mb-2"><WorkspaceIcon name="left" className="h-4 w-4" /> Roadmap portefeuille</Link>}
          <h1 className="workspace-page-title break-words">{project?.title ?? "Roadmap"}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
            {project ? (
              <>
                <span className="pilot-status" data-status={project.status}>{projectLabels[project.status] ?? project.status}</span>
                <span>{project.owner?.name ?? "Responsable à attribuer"}</span>
                {project.priority !== "NORMAL" && <span>Priorité {priorityLabels[project.priority]?.toLocaleLowerCase("fr") ?? project.priority}</span>}
                {project.targetDate && <span>Date cible · {pilotageDate(project.targetDate)}</span>}
                {project.objective && <span>{project.objective.title}</span>}
              </>
            ) : <p>{filtered.length} {filtered.length === 1 ? "projet affiché" : "projets affichés"}</p>}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {project ? (
            <>
              {dsi && <Link href={`/projects/${encodeURIComponent(project.id)}`} className="button-secondary">Fiche projet</Link>}
              {dsi && <Link href={`/assistant?project=${encodeURIComponent(project.id)}`} className="button-secondary gap-2"><WorkspaceIcon name="sparkles" className="h-4 w-4" /> Analyser un compte rendu</Link>}
              <Link href={`${actionList}&new=1`} className="button-primary gap-1.5"><WorkspaceIcon name="plus" className="h-4 w-4" /> Nouvelle action</Link>
            </>
          ) : dsi && (
            <>
              <Link id="mise-a-jour" href="/assistant" className="button-secondary gap-2"><WorkspaceIcon name="sparkles" className="h-4 w-4" /> Analyser un compte rendu</Link>
              <Link href="/projects?new=1" className="button-primary gap-1.5"><WorkspaceIcon name="plus" className="h-4 w-4" /> Nouveau projet</Link>
            </>
          )}
        </div>
      </header>

      <section className="pilot-panel min-w-0" id={project ? "planning-projet" : "planning"}>
        {!project && (
          <form action="/roadmap" key={`${search}|${status}|${objective}`} className="roadmap-filters">
            <input type="hidden" name="month" value={monthKey(anchor)} />
            <input type="hidden" name="span" value={horizon} />
            {(agenda || calendar) && <input type="hidden" name="display" value={agenda ? "agenda" : "calendar"} />}
            <label className="roadmap-filter-search">
              <WorkspaceIcon name="search" className="h-4 w-4" />
              <input className="field-input" type="search" name="q" defaultValue={search} maxLength={120} aria-label="Rechercher dans la roadmap" placeholder="Projet ou responsable…" />
            </label>
            <button className="button-secondary">Rechercher</button>
            <details className="filter-disclosure">
              <summary className="button-secondary">Filtres{status !== "open" || objective ? " (actifs)" : ""}</summary>
              <div className="filter-options">
                <select className="field-select" name="status" defaultValue={status} aria-label="Statut du projet">
                  <option value="open">Projets ouverts</option>
                  <option value="all">Tous les projets</option>
                  {viewStatuses.slice(2).map((item) => <option key={item} value={item}>{projectLabels[item]}</option>)}
                </select>
                {objectives.length > 0 && <select className="field-select" name="objective" defaultValue={objective} aria-label="Objectif stratégique">
                  <option value="">Tous les objectifs</option>
                  {objectives.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                </select>}
                <button className="button-primary">Appliquer les filtres</button>
              </div>
            </details>
            {(search || objective || status !== "open") && <Link className="workspace-panel-link" href={roadmapHref({ q: null, status: null, objective: null })}>Réinitialiser</Link>}
          </form>
        )}
        <nav className="flex flex-wrap gap-2 border-b border-slate-200 p-3" aria-label="Affichage de la roadmap">
          <Link href={roadmapHref({ display: "agenda" })} className={agenda ? "button-primary" : "button-secondary"} aria-current={agenda ? "page" : undefined}>Liste des échéances</Link>
          <Link href={roadmapHref({ display: "calendar" })} className={calendar ? "button-primary" : "button-secondary"} aria-current={calendar ? "page" : undefined}>Calendrier</Link>
        </nav>
        {!agenda && <div className={calendar ? "roadmap-toolbar" : "roadmap-toolbar max-md:hidden"}>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="workspace-segment" aria-label="Changer de période">
              <Link href={roadmapHref({ month: monthKey(shiftMonths(anchor, -horizon)) })} className="workspace-icon-button" aria-label="Période précédente"><WorkspaceIcon name="left" /></Link>
              <Link href={roadmapHref({ month: null })} className="workspace-segment-link">Aujourd’hui</Link>
              <Link href={roadmapHref({ month: monthKey(shiftMonths(anchor, horizon)) })} className="workspace-icon-button" aria-label="Période suivante"><WorkspaceIcon name="right" /></Link>
            </div>
            <h2 className="roadmap-period">{monthFormat.format(months[0])} – {monthFormat.format(months[months.length - 1])}</h2>
            {focusDate && (focusDate < anchor || focusDate >= shiftMonths(anchor, horizon)) && <Link className="workspace-panel-link" href={roadmapHref({ month: monthKey(focusDate) })}>Aller à l’échéance</Link>}
          </div>
          <div className="workspace-segment" aria-label="Horizon du planning">
            {horizons.map((count) => (
              <Link key={count} className="workspace-segment-link" href={roadmapHref({ span: String(count) })} aria-current={count === horizon ? "true" : undefined}>{count} mois</Link>
            ))}
          </div>
        </div>}
        {rows.length > 0 ? (
          <>
            {!calendar && <ul className={agenda ? "workspace-feed" : "workspace-feed md:hidden"} aria-label="Liste des échéances">
              {rows.map((row) => <li key={row.id} id={!dsi && row.kind === "milestone" ? `agenda-${row.id}` : undefined}>
                <Link href={!dsi && row.kind === "milestone" ? `#agenda-${row.id}` : row.href} className="workspace-feed-row">
                  <span className="workspace-feed-text">
                    <strong>{row.title}</strong>
                    <span>{row.kind === "milestone" ? "Jalon · " : ""}{row.targetDate ? pilotageDate(row.targetDate) : "Sans échéance"}{row.meta ? ` · ${row.meta}` : ""}</span>
                  </span>
                  <span className="pilot-status" data-status={row.status}>{row.statusLabel}</span>
                </Link>
              </li>)}
            </ul>}
            {!agenda && <div className={calendar ? undefined : "hidden md:block"}>
              <RoadmapTimeline months={months} rows={rows} today={today} label={project ? "Planning des actions et jalons" : "Calendrier des projets"} />
            </div>}
          </>
        ) : <p className="workspace-empty">{project ? dsi ? "Ajoutez un jalon depuis la fiche projet ou créez une action pour la planifier." : "Créez une action pour la planifier." : "Aucun projet dans cette vue."}</p>}
        {project ? (
          <div className="roadmap-footer">
            <span>{project.milestones.length} {project.milestones.length === 1 ? "jalon" : "jalons"} · {actions.filter((action) => action.status === "DONE").length}/{actions.length} actions terminées</span>
            <Link href={actionList} className="workspace-panel-link">Liste des actions <WorkspaceIcon name="arrow" className="h-4 w-4" /></Link>
          </div>
        ) : (
          <div className="roadmap-footer">
            <div className={agenda ? "hidden" : calendar ? "flex flex-wrap items-center gap-x-4 gap-y-1" : "hidden flex-wrap items-center gap-x-4 gap-y-1 md:flex"}>
              <span className="flex items-center gap-1.5"><span className="roadmap-legend-today" /> Aujourd’hui</span>
              <span className="flex items-center gap-1.5"><WorkspaceIcon name="diamond" className="h-3.5 w-3.5 text-amber-700" /> Jalon</span>
            </div>
            {unassignedCount > 0 && <Link href="/actions?unassigned=true&openOnly=true" className="workspace-panel-link">{unassignedCount} {unassignedCount === 1 ? "action ouverte sans projet" : "actions ouvertes sans projet"} <WorkspaceIcon name="arrow" className="h-4 w-4" /></Link>}
          </div>
        )}
      </section>
    </div>
  );
}
