import Link from "next/link";
import { BudgetItemDeleteButton } from "@/components/budget/budget-item-delete-button";
import { BudgetItemFilters } from "@/components/budget/budget-item-filters";
import { BudgetItemForm } from "@/components/budget/budget-item-form";
import { prisma } from "@/lib/db/prisma";
import { getBudgetItemById, listBudgetItems } from "@/lib/services/budget-item-service";
import type { BudgetItemFilters as BudgetItemFiltersInput } from "@/lib/validation/budget-item";

type BudgetPageProps = {
  searchParams?: {
    search?: string;
    category?: string;
    fiscalYear?: string;
    selectedId?: string;
  };
};

export default async function BudgetPage({ searchParams }: BudgetPageProps) {
  const fiscalYear = searchParams?.fiscalYear ? Number(searchParams.fiscalYear) : undefined;
  const filters: BudgetItemFiltersInput = {
    search: searchParams?.search,
    category: searchParams?.category,
    fiscalYear: fiscalYear && !Number.isNaN(fiscalYear) ? fiscalYear : undefined
  };

  const [budgetItems, projects, contracts, vendors, selectedBudgetItem] = await Promise.all([
    listBudgetItems(filters),
    prisma.project.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.contract.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.vendor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    searchParams?.selectedId ? getBudgetItemById(searchParams.selectedId) : null
  ]);

  const projectOptions = projects.map((project) => ({ id: project.id, label: project.title }));
  const contractOptions = contracts.map((contract) => ({ id: contract.id, label: contract.title }));
  const vendorOptions = vendors.map((vendor) => ({ id: vendor.id, label: vendor.name }));
  const variance = selectedBudgetItem && selectedBudgetItem.plannedAmount !== null && selectedBudgetItem.estimatedActualAmount !== null
    ? selectedBudgetItem.estimatedActualAmount - selectedBudgetItem.plannedAmount
    : null;
  const baseParams = new URLSearchParams();

  if (searchParams?.search) baseParams.set("search", searchParams.search);
  if (searchParams?.category) baseParams.set("category", searchParams.category);
  if (filters.fiscalYear) baseParams.set("fiscalYear", filters.fiscalYear.toString());

  const buildSelectionHref = (selectedId?: string) => {
    const params = new URLSearchParams(baseParams);

    if (selectedId) {
      params.set("selectedId", selectedId);
    }

    const query = params.toString();
    return query ? `/budget?${query}` : "/budget";
  };

  return (
    <div className="space-y-4">
      <div className="workbench-header">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Budget</h1>
          <p className="text-sm text-slate-600">Compare les lignes budgétaires et ajuste-les dans le même flux de travail, sans rupture de contexte.</p>
          <div className="workbench-kpi-grid">
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Lignes</div>
              <div className="workbench-kpi-value">{budgetItems.length}</div>
            </div>
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Sélection</div>
              <div className="workbench-kpi-value">{selectedBudgetItem ? "1" : "0"}</div>
            </div>
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Écart</div>
              <div className="workbench-kpi-value">{variance ?? "—"}</div>
            </div>
          </div>
        </div>
        {selectedBudgetItem && (
          <Link href={buildSelectionHref()} className="button-secondary">
            Fermer le panneau
          </Link>
        )}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr),460px]">
        <section className="space-y-4">
          <BudgetItemFilters values={{ ...filters, fiscalYear: filters.fiscalYear?.toString() }} />
          <div className="workbench-table-shell">
            <table className="workbench-table">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Exercice</th>
                  <th>Prévu</th>
                  <th>Engagé</th>
                  <th>Réel estimé</th>
                  <th>Rattachement</th>
                  <th>Modifier</th>
                </tr>
              </thead>
              <tbody>
                {budgetItems.map((item) => (
                  <tr key={item.id} data-selected={searchParams?.selectedId === item.id}>
                    <td>
                      <Link href={buildSelectionHref(item.id)} className="font-medium text-slate-900 hover:underline">
                        {item.title}
                      </Link>
                    </td>
                    <td>{item.fiscalYear ?? "—"}</td>
                    <td>{item.plannedAmount ?? "—"}</td>
                    <td>{item.committedAmount ?? "—"}</td>
                    <td>{item.estimatedActualAmount ?? "—"}</td>
                    <td>{item.project?.title ?? item.contract?.title ?? item.vendor?.name ?? "—"}</td>
                    <td>
                      <Link href={buildSelectionHref(item.id)} className="text-slate-900 hover:underline">
                        Modifier
                      </Link>
                    </td>
                  </tr>
                ))}
                {budgetItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-slate-500">
                      Aucune ligne budgétaire.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <section className="workbench-panel">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="panel-title">
                  {selectedBudgetItem ? "Éditer la ligne" : "Nouvelle ligne budgétaire"}
                </h2>
                <p className="panel-caption">
                  {selectedBudgetItem ? "Les montants et rattachements de la ligne sélectionnée sont modifiables ici." : "Crée ou modifie une ligne depuis ce panneau unique."}
                </p>
              </div>
              {selectedBudgetItem && <BudgetItemDeleteButton budgetItemId={selectedBudgetItem.id} />}
            </div>
            <BudgetItemForm
              mode={selectedBudgetItem ? "edit" : "create"}
              budgetItemId={selectedBudgetItem?.id}
              projectOptions={projectOptions}
              contractOptions={contractOptions}
              vendorOptions={vendorOptions}
              initialValues={selectedBudgetItem ? {
                title: selectedBudgetItem.title,
                category: selectedBudgetItem.category ?? "",
                projectId: selectedBudgetItem.projectId ?? "",
                contractId: selectedBudgetItem.contractId ?? "",
                vendorId: selectedBudgetItem.vendorId ?? "",
                fiscalYear: selectedBudgetItem.fiscalYear?.toString() ?? "",
                plannedAmount: selectedBudgetItem.plannedAmount?.toString() ?? "",
                committedAmount: selectedBudgetItem.committedAmount?.toString() ?? "",
                estimatedActualAmount: selectedBudgetItem.estimatedActualAmount?.toString() ?? "",
                notes: selectedBudgetItem.notes ?? ""
              } : undefined}
              showHeader={false}
            />
          </section>

          {selectedBudgetItem && (
            <section className="workbench-panel panel-stat-list">
              <h3 className="panel-title">Synthèse</h3>
              <p><strong>Projet:</strong> {selectedBudgetItem.project?.title ?? "—"}</p>
              <p><strong>Contrat:</strong> {selectedBudgetItem.contract?.title ?? "—"}</p>
              <p><strong>Prestataire:</strong> {selectedBudgetItem.vendor?.name ?? "—"}</p>
              <p><strong>Prévu:</strong> {selectedBudgetItem.plannedAmount ?? "—"}</p>
              <p><strong>Engagé:</strong> {selectedBudgetItem.committedAmount ?? "—"}</p>
              <p><strong>Réel estimé:</strong> {selectedBudgetItem.estimatedActualAmount ?? "—"}</p>
              <p><strong>Écart prévu/réel:</strong> {variance ?? "—"}</p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
