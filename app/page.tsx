import Link from "next/link";
import { Portfolio } from "@/components/pilotage/portfolio";
import { ReviewFeed } from "@/components/pilotage/review-feed";
import { WorkspaceIcon, type WorkspaceIconName } from "@/components/ui/workspace-icon";
import { requireMember } from "@/lib/auth/session";
import { readCockpit } from "@/lib/services/cockpit-service";
import { pilotageDate } from "@/lib/services/pilotage-service";

export const dynamic = "force-dynamic";

const dateLabel = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeZone: "Europe/Paris" });
const tabs = [
  { value: "", label: "Tous" },
  { value: "urgent", label: "Urgences" },
  { value: "actions", label: "Actions" },
  { value: "decisions", label: "Arbitrages" }
];

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ focus?: string }> }) {
  await requireMember("DSI");
  const { focus } = await searchParams;
  const activeTab = tabs.find((tab) => tab.value === focus)?.value ?? "";
  const { generatedAt, counts, items, projects, projectCount, milestones } = await readCockpit();
  const filteredItems = items.filter((item) =>
    (!activeTab || (activeTab === "urgent" && item.urgency === "urgent") ||
      (activeTab === "actions" && item.category === "Actions") ||
      (activeTab === "decisions" && item.category === "Arbitrages"))
  );
  const visibleItems = filteredItems.slice(0, 6);
  const reviewLink = activeTab === "urgent" ? "/weekly-review?urgency=urgent" :
    activeTab === "actions" ? "/weekly-review?category=Actions" :
    activeTab === "decisions" ? "/weekly-review?category=Arbitrages" : "/weekly-review";
  const metrics: { label: string; value: number; href: string; tone: string; icon: WorkspaceIconName }[] = [
    { label: "Urgences", value: counts.urgent, href: "/?focus=urgent", tone: "rose", icon: "alert" },
    { label: "Points à suivre", value: counts.total, href: "/weekly-review", tone: "amber", icon: "review" },
    { label: "Arbitrages en attente", value: counts.decisions, href: "/?focus=decisions", tone: "violet", icon: "decision" },
    { label: "Projets en cours", value: counts.activeProjects, href: "/projects?status=ACTIVE", tone: "blue", icon: "folder" }
  ];

  return (
    <div className="workspace-page">
      <header className="cockpit-hero">
        <div>
          <p className="cockpit-date"><time dateTime={generatedAt.toISOString()}>{dateLabel.format(generatedAt)}</time></p>
          <h1 className="cockpit-title">Pilotage DSI</h1>
          <p className="mt-2 max-w-md text-sm text-slate-200 sm:text-base">Priorités du jour, échéances et avancement du portefeuille.</p>
        </div>
        <div className="flex flex-wrap gap-2 ">
          <Link href="/workspace" className="cockpit-secondary gap-2"><WorkspaceIcon name="document" className="h-4 w-4" /> Espace de travail</Link>
          <Link href="/actions?new=1" className="cockpit-secondary gap-2"><WorkspaceIcon name="plus" className="h-4 w-4" /> Nouvelle action</Link>
          <Link href="/assistant" className="cockpit-primary gap-2"><WorkspaceIcon name="sparkles" className="h-4 w-4" /> Analyser un compte rendu</Link>
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

      {!projectCount && <section className="cockpit-onboarding" aria-label="Premiers pas">
        <div>
          <h2 className="font-semibold text-slate-950">Créez votre premier projet</h2>
          <p className="mt-1 text-sm text-slate-600">Fixez une échéance et rattachez les actions issues de vos comptes rendus.</p>
        </div>
        <Link href="/projects?new=1" className="button-primary gap-2"><WorkspaceIcon name="plus" className="h-4 w-4" /> Nouveau projet</Link>
      </section>}

      <div className="workspace-dashboard-grid">
        <section className="pilot-panel min-w-0" aria-labelledby="priorites-title">
          <div className="workspace-panel-heading">
            <div>
              <h2 id="priorites-title">À traiter en priorité</h2>
              <p className="mt-0.5 text-xs text-slate-600">{filteredItems.length} {filteredItems.length === 1 ? "point à examiner" : "points à examiner"}</p>
            </div>
            <Link href={reviewLink} className="workspace-panel-link">Ouvrir la revue <WorkspaceIcon name="arrow" className="h-4 w-4" /></Link>
          </div>
          <nav className="workspace-tabs cockpit-tabs" aria-label="Filtrer les priorités">
            {tabs.map((tab) => <Link key={tab.value} href={tab.value ? `/?focus=${tab.value}#priorites-title` : "/#priorites-title"}
              aria-current={tab.value === activeTab ? "page" : undefined} scroll>{tab.label}</Link>)}
          </nav>
          {visibleItems.length ? <ReviewFeed items={visibleItems} /> : <p className="workspace-empty">
            {activeTab ? "Aucun point pour ce filtre." : "Aucun point à traiter dans la revue."}
          </p>}
          {filteredItems.length > visibleItems.length && <Link href={reviewLink} className="workspace-panel-footer">
            Voir les {filteredItems.length} points <WorkspaceIcon name="arrow" className="h-4 w-4" />
          </Link>}
        </section>

        <div className="min-w-0 space-y-5">
          <section className="pilot-panel">
            <div className="workspace-panel-heading">
              <h2>Prochains jalons</h2>
              <Link href="/roadmap" className="workspace-panel-link">Roadmap <WorkspaceIcon name="arrow" className="h-4 w-4" /></Link>
            </div>
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

          <section className="pilot-panel">
            <div className="workspace-panel-heading"><h2>Préparer un point de suivi</h2></div>
            <ul className="workspace-feed">
              {[
                { label: "Exporter le brief hebdomadaire", href: "/api/reports/markdown?type=weekly", icon: "document" },
                { label: "Préparer le CODIR", href: "/reports?type=codir", icon: "review" },
                { label: "Piloter depuis Claude Desktop", href: "/settings/integrations/claude", icon: "sparkles" }
              ].map(({ label, href, icon }) => <li key={href}>
                <a className="workspace-feed-row" href={href}>
                  <span className="workspace-feed-icon"><WorkspaceIcon name={icon as WorkspaceIconName} className="h-4 w-4" /></span>
                  <span className="workspace-feed-text"><strong>{label}</strong></span>
                  <WorkspaceIcon name="right" className="workspace-feed-arrow h-4 w-4" />
                </a>
              </li>)}
            </ul>
          </section>
        </div>
      </div>

      <section className="pilot-panel">
        <div className="workspace-panel-heading">
          <h2>Portefeuille en cours</h2>
          <Link href="/projects?status=ACTIVE" className="workspace-panel-link">Tous les projets actifs <WorkspaceIcon name="arrow" className="h-4 w-4" /></Link>
        </div>
        <Portfolio projects={projects.slice(0, 6)} />
      </section>
    </div>
  );
}
