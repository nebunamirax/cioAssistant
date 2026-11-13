import { DecisionForm } from "@/components/decisions/decision-form";
import { prisma } from "@/lib/db/prisma";
import { DECISION_STATUSES } from "@/lib/domain/constants";
import { listDecisions, parseDecisionOptions } from "@/lib/services/decision-service";

type DecisionsPageProps = {
  searchParams?: Promise<{
    search?: string;
    status?: string;
  }>;
};

function isDecisionStatus(value: string | undefined): value is (typeof DECISION_STATUSES)[number] {
  return !!value && DECISION_STATUSES.includes(value as (typeof DECISION_STATUSES)[number]);
}

export default async function DecisionsPage({ searchParams: searchParamsPromise }: DecisionsPageProps) {
  const searchParams = await searchParamsPromise;
  const [decisions, projects] = await Promise.all([
    listDecisions({
      search: searchParams?.search,
      status: isDecisionStatus(searchParams?.status) ? searchParams.status : undefined
    }),
    prisma.project.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } })
  ]);

  const pending = decisions.filter((decision) => decision.status === "PENDING").length;
  const dueSoon = decisions.filter((decision) => {
    if (!decision.targetDate || decision.status !== "PENDING") return false;
    return decision.targetDate < new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 21);
  }).length;

  return (
    <div className="space-y-4">
      <div className="workbench-header">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Décisions</h1>

          <div className="workbench-kpi-grid">
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Total</div>
              <div className="workbench-kpi-value">{decisions.length}</div>
            </div>
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">À décider</div>
              <div className="workbench-kpi-value">{pending}</div>
            </div>
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">21 jours</div>
              <div className="workbench-kpi-value">{dueSoon}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr),440px]">
        <section className="space-y-4">
          <form className="workbench-toolbar-compact" action="/decisions">
            <input name="search" defaultValue={searchParams?.search ?? ""} placeholder="Rechercher" className="field-input" />
            <select name="status" defaultValue={searchParams?.status ?? ""} className="field-select">
              <option value="">Tous les statuts</option>
              {DECISION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <button className="button-secondary">Filtrer</button>
          </form>

          <div className="grid gap-3">
            {decisions.map((decision) => {
              const options = parseDecisionOptions(decision.optionsJson);
              return (
                <article id={decision.id} key={decision.id} className="workbench-panel space-y-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{decision.status}</p>
                      <h2 className="mt-1 text-base font-semibold text-slate-950">{decision.subject}</h2>
                      <p className="mt-1 text-sm text-slate-600">{decision.context ?? "Aucun contexte détaillé."}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {decision.targetDate ? new Intl.DateTimeFormat("fr-FR").format(decision.targetDate) : "Date non fixée"}
                    </div>
                  </div>
                  {options.length > 0 ? (
                    <div className="grid gap-2 md:grid-cols-3">
                      {options.map((option) => (
                        <div key={option} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{option}</div>
                      ))}
                    </div>
                  ) : null}
                  <div className="grid gap-3 md:grid-cols-3">
                    <p className="text-sm text-slate-700"><strong>Recommandation:</strong> {decision.recommendation ?? "—"}</p>
                    <p className="text-sm text-slate-700"><strong>Décideur:</strong> {decision.decider ?? "—"}</p>
                    <p className="text-sm text-slate-700"><strong>Projet:</strong> {decision.project?.title ?? "—"}</p>
                  </div>
                </article>
              );
            })}
            {decisions.length === 0 ? (
              <section className="workbench-panel text-sm text-slate-500">Aucune décision.</section>
            ) : null}
          </div>
        </section>

        <aside className="workbench-panel xl:sticky xl:top-4 xl:self-start">
          <DecisionForm projects={projects} />
        </aside>
      </div>
    </div>
  );
}
