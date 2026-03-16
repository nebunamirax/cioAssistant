import { AssistantChat } from "@/components/assistant/assistant-chat";
import { prisma } from "@/lib/db/prisma";

function InfoDot({ label }: { label: string }) {
  return (
    <span className="info-dot" title={label} aria-label={label}>
      i
    </span>
  );
}

export default async function DashboardPage() {
  const [overdue, activeProjects, contractsEnding, vendorCount, budgetCount, communicationCount, pendingReviews] = await Promise.all([
    prisma.action.count({ where: { dueDate: { lt: new Date() }, status: { not: "DONE" } } }),
    prisma.project.count({ where: { status: "ACTIVE" } }),
    prisma.contract.count({
      where: {
        endDate: {
          lt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
        }
      }
    }),
    prisma.vendor.count(),
    prisma.budgetItem.count(),
    prisma.communication.count(),
    prisma.aIIntakeReview.count({ where: { status: "PENDING" } })
  ]);

  return (
    <div className="space-y-4">
      <section className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.35)] sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Dashboard</p>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-950 sm:text-2xl">Demande rapide</h1>
              <InfoDot label="Le chat est l'entree principale. Les chiffres servent seulement de repere rapide." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
            <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Retard</p>
              <p className="mt-1 text-base font-semibold text-slate-950">{overdue}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Projets</p>
              <p className="mt-1 text-base font-semibold text-slate-950">{activeProjects}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Contrats</p>
              <p className="mt-1 text-base font-semibold text-slate-950">{contractsEnding}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Prestataires</p>
              <p className="mt-1 text-base font-semibold text-slate-950">{vendorCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Budget</p>
              <p className="mt-1 text-base font-semibold text-slate-950">{budgetCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Comms</p>
              <p className="mt-1 text-base font-semibold text-slate-950">{communicationCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Revue IA</p>
              <p className="mt-1 text-base font-semibold text-slate-950">{pendingReviews}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr),280px]">
        <AssistantChat />

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <section className="workbench-panel space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="panel-title">Radar</h2>
              <InfoDot label="Seulement les signaux a surveiller en priorite." />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
                <span className="text-sm text-slate-600">Actions en retard</span>
                <strong className="text-sm text-slate-950">{overdue}</strong>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
                <span className="text-sm text-slate-600">Contrats a echeance</span>
                <strong className="text-sm text-slate-950">{contractsEnding}</strong>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
                <span className="text-sm text-slate-600">Revues IA en attente</span>
                <strong className="text-sm text-slate-950">{pendingReviews}</strong>
              </div>
            </div>
          </section>

          <section className="workbench-panel space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="panel-title">Volumes</h2>
              <InfoDot label="Compte rapide des principaux modules metier." />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Projets actifs</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{activeProjects}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Prestataires</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{vendorCount}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Lignes budget</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{budgetCount}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Communications</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{communicationCount}</p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
