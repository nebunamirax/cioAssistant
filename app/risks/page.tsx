import { RiskForm } from "@/components/risks/risk-form";
import { prisma } from "@/lib/db/prisma";
import { RISK_LEVELS, RISK_STATUSES } from "@/lib/domain/constants";
import { listRisks } from "@/lib/services/risk-service";
import { riskLevelLabels, riskStatusLabels } from "@/lib/domain/display-labels";
import { ReviewStatusForm } from "@/components/pilotage/review-status-form";
import { pilotageDate } from "@/lib/services/pilotage-service";

type RisksPageProps = {
  searchParams?: Promise<{
    search?: string;
    projectId?: string;
    status?: string;
    criticality?: string;
  }>;
};

function isRiskStatus(value: string | undefined): value is (typeof RISK_STATUSES)[number] {
  return !!value && RISK_STATUSES.includes(value as (typeof RISK_STATUSES)[number]);
}

function isRiskLevel(value: string | undefined): value is (typeof RISK_LEVELS)[number] {
  return !!value && RISK_LEVELS.includes(value as (typeof RISK_LEVELS)[number]);
}

export default async function RisksPage({ searchParams: searchParamsPromise }: RisksPageProps) {
  const searchParams = await searchParamsPromise;
  const [risks, projects, vendors] = await Promise.all([
    listRisks({
      search: searchParams?.search,
      projectId: typeof searchParams?.projectId === "string" ? searchParams.projectId : undefined,
      status: isRiskStatus(searchParams?.status) ? searchParams.status : undefined,
      criticality: isRiskLevel(searchParams?.criticality) ? searchParams.criticality : undefined
    }),
    prisma.project.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
    prisma.vendor.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
  ]);

  const openCritical = risks.filter((risk) => ["OPEN", "MITIGATING"].includes(risk.status) && ["HIGH", "CRITICAL"].includes(risk.criticality)).length;

  return (
    <div className="space-y-4">
      <div className="workbench-header">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Risques</h1>

          <div className="workbench-kpi-grid">
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Total</div>
              <div className="workbench-kpi-value">{risks.length}</div>
            </div>
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Critiques ouverts</div>
              <div className="workbench-kpi-value">{openCritical}</div>
            </div>
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Mitigation</div>
              <div className="workbench-kpi-value">{risks.filter((risk) => risk.status === "MITIGATING").length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr),440px]">
        <section className="min-w-0 space-y-4">
          <form className="workbench-toolbar" action="/risks">
            {searchParams?.projectId && <input type="hidden" name="projectId" value={searchParams.projectId} />}
            <input name="search" defaultValue={searchParams?.search ?? ""} placeholder="Rechercher" className="field-input" />
            <select name="status" defaultValue={searchParams?.status ?? ""} className="field-select">
              <option value="">Tous les statuts</option>
              {RISK_STATUSES.map((status) => <option key={status} value={status}>{riskStatusLabels[status]}</option>)}
            </select>
            <select name="criticality" defaultValue={searchParams?.criticality ?? ""} className="field-select">
              <option value="">Toutes criticités</option>
              {RISK_LEVELS.map((level) => <option key={level} value={level}>{riskLevelLabels[level]}</option>)}
            </select>
            <button className="button-secondary">Filtrer</button>
          </form>

          <div className="grid gap-3">
            {risks.map((risk) => (
              <article id={risk.id} key={risk.id} className="workbench-panel min-w-0 space-y-3 break-words">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-slate-950">{risk.title}</h2>
                    <p className="mt-1 text-xs text-slate-600">
                      {[risk.project?.title, risk.ownerName || "Sans responsable", risk.dueDate && pilotageDate(risk.dueDate)].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="pilot-status" data-status={risk.criticality === "CRITICAL" ? "BLOCKED" : undefined}>
                    {riskLevelLabels[risk.criticality as keyof typeof riskLevelLabels] ?? risk.criticality}
                  </span>
                </div>
                {risk.description && <p className="text-sm text-slate-600">{risk.description}</p>}
                {risk.mitigation && <p className="text-sm text-slate-700"><strong>Mesure de réduction du risque</strong><br />{risk.mitigation}</p>}
                <ReviewStatusForm kind="risk" id={risk.id} status={risk.status} labels={riskStatusLabels} />
              </article>
            ))}
            {!risks.length && <p className="workbench-panel text-sm text-slate-600">Aucun risque.</p>}
          </div>
        </section>

        <aside id="nouveau-risque" className="workbench-panel min-w-0 xl:sticky xl:top-4 xl:self-start">
          <RiskForm key={searchParams?.projectId} projects={projects} vendors={vendors} initialProjectId={projects.find((project) => project.id === searchParams?.projectId)?.id} />
        </aside>
      </div>
    </div>
  );
}
