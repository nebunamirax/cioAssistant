import { prisma } from "@/lib/db/prisma";
import { Card } from "@/components/ui/card";

export default async function DashboardPage() {
  const [overdue, activeProjects, contractsEnding] = await Promise.all([
    prisma.action.count({ where: { dueDate: { lt: new Date() }, status: { not: "DONE" } } }),
    prisma.project.count({ where: { status: "ACTIVE" } }),
    prisma.contract.count({
      where: {
        endDate: {
          lt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
        }
      }
    })
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Actions en retard">{overdue}</Card>
        <Card title="Projets actifs">{activeProjects}</Card>
        <Card title="Contrats à échéance (30j)">{contractsEnding}</Card>
      </div>
    </div>
  );
}
