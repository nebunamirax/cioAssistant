import { prisma } from "@/lib/db/prisma";
import { AIIntakePanel } from "@/components/dashboard/ai-intake-panel";
import { Card } from "@/components/ui/card";

export default async function DashboardPage() {
  const [overdue, activeProjects, contractsEnding, vendorCount, budgetCount, communicationCount] = await Promise.all([
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
    prisma.communication.count()
  ]);

  return (
    <div className="space-y-5">
      <section className="workbench-header">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Dashboard</p>
          <h1 className="text-3xl font-semibold text-slate-950">Cockpit principal</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Supervise les points de tension et capture directement un document ou un texte pour laisser l’IA répartir l’information dans les bons modules.
          </p>
        </div>
        <div className="workbench-kpi-grid min-w-full md:min-w-[360px]">
          <div className="workbench-kpi">
            <p className="workbench-kpi-label">Actions en retard</p>
            <p className="workbench-kpi-value">{overdue}</p>
          </div>
          <div className="workbench-kpi">
            <p className="workbench-kpi-label">Projets actifs</p>
            <p className="workbench-kpi-value">{activeProjects}</p>
          </div>
          <div className="workbench-kpi">
            <p className="workbench-kpi-label">Contrats à échéance</p>
            <p className="workbench-kpi-value">{contractsEnding}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
        <AIIntakePanel />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Card title="Prestataires">{vendorCount}</Card>
          <Card title="Lignes budget">{budgetCount}</Card>
          <Card title="Communications">{communicationCount}</Card>
        </section>
      </div>
    </div>
  );
}
