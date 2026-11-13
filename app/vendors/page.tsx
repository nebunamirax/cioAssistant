import Link from "next/link";
import { VendorDeleteButton } from "@/components/vendors/vendor-delete-button";
import { VendorFilters } from "@/components/vendors/vendor-filters";
import { VendorForm } from "@/components/vendors/vendor-form";
import { getVendorById, listVendors } from "@/lib/services/vendor-service";
import type { VendorFilters as VendorFiltersInput } from "@/lib/validation/vendor";

type VendorsPageProps = {
  searchParams?: Promise<{
    search?: string;
    category?: string;
    selectedId?: string;
    new?: string;
  }>;
};

export default async function VendorsPage({ searchParams: searchParamsPromise }: VendorsPageProps) {
  const searchParams = await searchParamsPromise;
  const filters: VendorFiltersInput = {
    search: searchParams?.search,
    category: searchParams?.category
  };
  const [vendors, selectedVendor] = await Promise.all([
    listVendors(filters),
    searchParams?.selectedId ? getVendorById(searchParams.selectedId) : null
  ]);
  const baseParams = new URLSearchParams();

  if (searchParams?.search) baseParams.set("search", searchParams.search);
  if (searchParams?.category) baseParams.set("category", searchParams.category);

  const panelOpen = Boolean(selectedVendor || searchParams?.new === "1");

  const buildSelectionHref = (selectedId?: string, create = false) => {
    const params = new URLSearchParams(baseParams);

    if (selectedId) {
      params.set("selectedId", selectedId);
    } else if (create) {
      params.set("new", "1");
    }

    const query = params.toString();
    return query ? `/vendors?${query}` : "/vendors";
  };

  return (
    <div className="space-y-4">
      <div className="workbench-header">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Prestataires</h1>
          <div className="workbench-kpi-grid">
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Prestataires</div>
              <div className="workbench-kpi-value">{vendors.length}</div>
            </div>
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Contrats</div>
              <div className="workbench-kpi-value">{selectedVendor?._count.contracts ?? "—"}</div>
            </div>
          </div>
        </div>
        {panelOpen ? (
          <Link href={buildSelectionHref()} className="button-secondary">
            Fermer
          </Link>
        ) : (
          <Link href={buildSelectionHref(undefined, true)} className="button-primary">Nouveau prestataire</Link>
        )}
      </div>
      <div className={panelOpen ? "workspace-split" : "space-y-4"}>
        <section className="min-w-0 space-y-4">
          <VendorFilters values={filters} />
          <div className="workbench-table-shell">
            <table className="workbench-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Catégorie</th>
                  <th>Contact</th>
                  <th>Contrats</th>
                  <th>Actions</th>
                  <th>Modifier</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr key={vendor.id} data-selected={searchParams?.selectedId === vendor.id}>
                    <td>
                      <Link href={buildSelectionHref(vendor.id)} className="font-medium text-slate-900 hover:underline">
                        {vendor.name}
                      </Link>
                    </td>
                    <td>{vendor.category ?? "—"}</td>
                    <td>{vendor.mainContactName ?? vendor.mainContactEmail ?? "—"}</td>
                    <td>{vendor._count.contracts}</td>
                    <td>{vendor._count.actions}</td>
                    <td>
                      <Link href={buildSelectionHref(vendor.id)} className="text-slate-900 hover:underline">
                        Modifier
                      </Link>
                    </td>
                  </tr>
                ))}
                {vendors.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-slate-500">
                      Aucun prestataire.
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
                  {selectedVendor ? "Éditer le prestataire" : "Nouveau prestataire"}
                </h2>
              </div>
              {selectedVendor && <VendorDeleteButton vendorId={selectedVendor.id} />}
            </div>
            <VendorForm key={selectedVendor?.id ?? "new"}
              mode={selectedVendor ? "edit" : "create"}
              vendorId={selectedVendor?.id}
              initialValues={selectedVendor ? {
                name: selectedVendor.name,
                category: selectedVendor.category ?? "",
                mainContactName: selectedVendor.mainContactName ?? "",
                mainContactEmail: selectedVendor.mainContactEmail ?? "",
                notes: selectedVendor.notes ?? ""
              } : undefined}
              showHeader={false}
            />
          </section>

          {selectedVendor && (
            <section className="workbench-panel panel-stat-list">
              <h3 className="panel-title">Synthèse</h3>
              <p><strong>Contrats:</strong> {selectedVendor._count.contracts}</p>
              <p><strong>Actions:</strong> {selectedVendor._count.actions}</p>
              <p><strong>Services:</strong> {selectedVendor._count.supportServices}</p>
              <p><strong>Budget:</strong> {selectedVendor._count.budgetItems}</p>
              <p><strong>Email:</strong> {selectedVendor.mainContactEmail ?? "—"}</p>
            </section>
          )}
        </aside>}
      </div>
    </div>
  );
}
