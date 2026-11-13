import { RiskForm } from "@/components/risks/risk-form";
import { prisma } from "@/lib/db/prisma";
import { RISK_LEVELS, RISK_STATUSES } from "@/lib/domain/constants";
import { listRisks } from "@/lib/services/risk-service";

type RisksPageProps = {
  searchParams?: Promise<{
    search?: string;
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
      status: isRiskStatus(searchParams?.status) ? searchParams.status : undefined,
      criticality: isRiskLevel(searchParams?.criticality) ? searchParams.criticality : undefined
    }),
    prisma.project.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
    prisma.vendor.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
  ]);

  const openCritical = risks.filter((risk) => risk.status !== "CLOSED" && (risk.criticality === "HIGH" || risk.criticality === "CRITICAL")).length;

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
        <section className="space-y-4">
          <form className="workbench-toolbar" action="/risks">
            <input name="search" defaultValue={searchParams?.search ?? ""} placeholder="Rechercher" className="field-input" />
            <select name="status" defaultValue={searchParams?.status ?? ""} className="field-select">
              <option value="">Tous les statuts</option>
              {RISK_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <select name="criticality" defaultValue={searchParams?.criticality ?? ""} className="field-select">
              <option value="">Toutes criticités</option>
              {RISK_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
            </select>
            <button className="button-secondary">Filtrer</button>
          </form>

          <div className="workbench-table-shell">
            <table className="workbench-table">
              <thead>
                <tr>
                  <th>Risque</th>
                  <th>Criticité</th>
                  <th>Statut</th>
                  <th>Responsable</th>
                  <th>Projet</th>
                  <th>Mitigation</th>
                </tr>
              </thead>
              <tbody>
                {risks.map((risk) => (
                  <tr id={risk.id} key={risk.id}>
                    <td>
                      <p className="font-medium text-slate-900">{risk.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{risk.description ?? "—"}</p>
                    </td>
                    <td>{risk.criticality}</td>
                    <td>{risk.status}</td>
                    <td>{risk.ownerName ?? "—"}</td>
                    <td>{risk.project?.title ?? "—"}</td>
                    <td className="max-w-[260px]">{risk.mitigation ?? "—"}</td>
                  </tr>
                ))}
                {risks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-slate-500">Aucun risque.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="workbench-panel xl:sticky xl:top-4 xl:self-start">
          <RiskForm projects={projects} vendors={vendors} />
        </aside>
      </div>
    </div>
  );
}
