import Link from "next/link";
import { BudgetItemDeleteButton } from "@/components/budget/budget-item-delete-button";
import { BudgetItemForm } from "@/components/budget/budget-item-form";
import { prisma } from "@/lib/db/prisma";
import { getBudgetItemById } from "@/lib/services/budget-item-service";
import { notFound } from "next/navigation";

function formatNumber(value: number | null) {
  return value === null ? "—" : value.toString();
}

export default async function BudgetItemDetailPage({ params }: { params: { id: string } }) {
  const [budgetItem, projects, contracts, vendors] = await Promise.all([
    getBudgetItemById(params.id),
    prisma.project.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.contract.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.vendor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
  ]);

  if (!budgetItem) return notFound();

  const projectOptions = projects.map((project) => ({ id: project.id, label: project.title }));
  const contractOptions = contracts.map((contract) => ({ id: contract.id, label: contract.title }));
  const vendorOptions = vendors.map((vendor) => ({ id: vendor.id, label: vendor.name }));
  const variance = budgetItem.plannedAmount !== null && budgetItem.estimatedActualAmount !== null
    ? budgetItem.estimatedActualAmount - budgetItem.plannedAmount
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/budget" className="text-sm text-slate-600 hover:underline">
            Retour au budget
          </Link>
          <h1 className="text-2xl font-semibold">{budgetItem.title}</h1>
        </div>
        <BudgetItemDeleteButton budgetItemId={budgetItem.id} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr),minmax(280px,1fr)]">
        <BudgetItemForm
          mode="edit"
          budgetItemId={budgetItem.id}
          projectOptions={projectOptions}
          contractOptions={contractOptions}
          vendorOptions={vendorOptions}
          initialValues={{
            title: budgetItem.title,
            category: budgetItem.category ?? "",
            projectId: budgetItem.projectId ?? "",
            contractId: budgetItem.contractId ?? "",
            vendorId: budgetItem.vendorId ?? "",
            fiscalYear: budgetItem.fiscalYear?.toString() ?? "",
            plannedAmount: budgetItem.plannedAmount?.toString() ?? "",
            committedAmount: budgetItem.committedAmount?.toString() ?? "",
            estimatedActualAmount: budgetItem.estimatedActualAmount?.toString() ?? "",
            notes: budgetItem.notes ?? ""
          }}
        />
        <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <h2 className="font-semibold text-slate-900">Synthèse</h2>
          <p><strong>Projet:</strong> {budgetItem.project?.title ?? "—"}</p>
          <p><strong>Contrat:</strong> {budgetItem.contract?.title ?? "—"}</p>
          <p><strong>Prestataire:</strong> {budgetItem.vendor?.name ?? "—"}</p>
          <p><strong>Prévu:</strong> {formatNumber(budgetItem.plannedAmount)}</p>
          <p><strong>Engagé:</strong> {formatNumber(budgetItem.committedAmount)}</p>
          <p><strong>Réel estimé:</strong> {formatNumber(budgetItem.estimatedActualAmount)}</p>
          <p><strong>Écart prévu/réel:</strong> {variance === null ? "—" : variance.toString()}</p>
        </section>
      </div>
    </div>
  );
}
