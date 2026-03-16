import { AssistantChat } from "@/components/assistant/assistant-chat";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db/prisma";

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
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.72fr]">
        <AssistantChat />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Card title="Actions en retard">{overdue}</Card>
          <Card title="Projets actifs">{activeProjects}</Card>
          <Card title="Contrats à échéance">{contractsEnding}</Card>
          <Card title="Prestataires">{vendorCount}</Card>
          <Card title="Lignes budget">{budgetCount}</Card>
          <Card title="Communications">{communicationCount}</Card>
          <Card title="Revue IA">{pendingReviews}</Card>
        </section>
      </div>
    </div>
  );
}
