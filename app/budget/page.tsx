import Link from "next/link";
import { BudgetItemFilters } from "@/components/budget/budget-item-filters";
import { BudgetItemForm } from "@/components/budget/budget-item-form";
import { prisma } from "@/lib/db/prisma";
import { listBudgetItems } from "@/lib/services/budget-item-service";
import type { BudgetItemFilters as BudgetItemFiltersInput } from "@/lib/validation/budget-item";

type BudgetPageProps = {
  searchParams?: {
    search?: string;
    category?: string;
    fiscalYear?: string;
  };
};

export default async function BudgetPage({ searchParams }: BudgetPageProps) {
  const fiscalYear = searchParams?.fiscalYear ? Number(searchParams.fiscalYear) : undefined;
  const filters: BudgetItemFiltersInput = {
    search: searchParams?.search,
    category: searchParams?.category,
    fiscalYear: fiscalYear && !Number.isNaN(fiscalYear) ? fiscalYear : undefined
  };

  const [budgetItems, projects, contracts, vendors] = await Promise.all([
    listBudgetItems(filters),
    prisma.project.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.contract.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.vendor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
  ]);

  const projectOptions = projects.map((project) => ({ id: project.id, label: project.title }));
  const contractOptions = contracts.map((contract) => ({ id: contract.id, label: contract.title }));
  const vendorOptions = vendors.map((vendor) => ({ id: vendor.id, label: vendor.name }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Budget</h1>
      <BudgetItemFilters values={{ ...filters, fiscalYear: filters.fiscalYear?.toString() }} />
      <BudgetItemForm
        projectOptions={projectOptions}
        contractOptions={contractOptions}
        vendorOptions={vendorOptions}
      />
      <div className="rounded-lg border border-slate-200 bg-white">
        <table className="w-full table-auto text-sm">
          <thead className="bg-slate-100 text-left text-slate-700">
            <tr>
              <th className="p-3">Titre</th>
              <th className="p-3">Exercice</th>
              <th className="p-3">Prévu</th>
              <th className="p-3">Engagé</th>
              <th className="p-3">Réel estimé</th>
              <th className="p-3">Rattachement</th>
            </tr>
          </thead>
          <tbody>
            {budgetItems.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="p-3">
                  <Link href={`/budget/${item.id}`} className="font-medium text-slate-900 hover:underline">
                    {item.title}
                  </Link>
                </td>
                <td className="p-3">{item.fiscalYear ?? "—"}</td>
                <td className="p-3">{item.plannedAmount ?? "—"}</td>
                <td className="p-3">{item.committedAmount ?? "—"}</td>
                <td className="p-3">{item.estimatedActualAmount ?? "—"}</td>
                <td className="p-3">{item.project?.title ?? item.contract?.title ?? item.vendor?.name ?? "—"}</td>
              </tr>
            ))}
            {budgetItems.length === 0 && (
              <tr>
                <td colSpan={6} className="p-3 text-slate-500">
                  Aucune ligne budgétaire.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
