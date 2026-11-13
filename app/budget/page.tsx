import Link from "next/link";
import { BudgetItemDeleteButton } from "@/components/budget/budget-item-delete-button";
import { BudgetItemFilters } from "@/components/budget/budget-item-filters";
import { BudgetItemForm } from "@/components/budget/budget-item-form";
import { prisma } from "@/lib/db/prisma";
import { getBudgetItemById, listBudgetItems } from "@/lib/services/budget-item-service";
import type { BudgetItemFilters as BudgetItemFiltersInput } from "@/lib/validation/budget-item";

type BudgetPageProps = {
  searchParams?: Promise<{
    search?: string;
    category?: string;
    fiscalYear?: string;
    selectedId?: string;
    new?: string;
  }>;
};

export default async function BudgetPage({ searchParams: searchParamsPromise }: BudgetPageProps) {
  const searchParams = await searchParamsPromise;
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

  const panelOpen = Boolean(selectedBudgetItem || searchParams?.new === "1");

  const buildSelectionHref = (selectedId?: string, create = false) => {
    const params = new URLSearchParams(baseParams);

    if (selectedId) {
      params.set("selectedId", selectedId);
    } else if (create) {
      params.set("new", "1");
    }

    const query = params.toString();
    return query ? `/budget?${query}` : "/budget";
  };

  return (
    <div className="space-y-4">
      <div className="workbench-header">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Budget</h1>
          <div className="workbench-kpi-grid">
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Lignes</div>
              <div className="workbench-kpi-value">{budgetItems.length}</div>
            </div>
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Écart</div>
              <div className="workbench-kpi-value">{variance ?? "—"}</div>
            </div>
          </div>
        </div>
        {panelOpen ? (
          <Link href={buildSelectionHref()} className="button-secondary">
            Fermer
          </Link>
        ) : (
          <Link href={buildSelectionHref(undefined, true)} className="button-primary">Nouvelle ligne</Link>
        )}
      </div>
      <div className={panelOpen ? "workspace-split" : "space-y-4"}>
        <section className="min-w-0 space-y-4">
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

        {panelOpen && <aside className="order-first min-w-0 space-y-4 xl:order-none">
          <section className="workbench-panel">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="panel-title">
                  {selectedBudgetItem ? "Éditer la ligne" : "Nouvelle ligne budgétaire"}
                </h2>
              </div>
              {selectedBudgetItem && <BudgetItemDeleteButton budgetItemId={selectedBudgetItem.id} />}
            </div>
            <BudgetItemForm key={selectedBudgetItem?.id ?? "new"}
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
        </aside>}
      </div>
    </div>
  );
}
