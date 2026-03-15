import Link from "next/link";
import { VendorDeleteButton } from "@/components/vendors/vendor-delete-button";
import { VendorFilters } from "@/components/vendors/vendor-filters";
import { VendorForm } from "@/components/vendors/vendor-form";
import { getVendorById, listVendors } from "@/lib/services/vendor-service";
import type { VendorFilters as VendorFiltersInput } from "@/lib/validation/vendor";

type VendorsPageProps = {
  searchParams?: {
    search?: string;
    category?: string;
    selectedId?: string;
  };
};

export default async function VendorsPage({ searchParams }: VendorsPageProps) {
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

  const buildSelectionHref = (selectedId?: string) => {
    const params = new URLSearchParams(baseParams);

    if (selectedId) {
      params.set("selectedId", selectedId);
    }

    const query = params.toString();
    return query ? `/vendors?${query}` : "/vendors";
  };

  return (
    <div className="space-y-4">
      <div className="workbench-header">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Prestataires</h1>
          <p className="text-sm text-slate-600">Travaille la base fournisseurs comme un annuaire opérable, avec lecture et édition simultanées.</p>
          <div className="workbench-kpi-grid">
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Prestataires</div>
              <div className="workbench-kpi-value">{vendors.length}</div>
            </div>
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Contrats</div>
              <div className="workbench-kpi-value">{selectedVendor?._count.contracts ?? "—"}</div>
            </div>
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Sélection</div>
              <div className="workbench-kpi-value">{selectedVendor ? "1" : "0"}</div>
            </div>
          </div>
        </div>
        {selectedVendor && (
          <Link href={buildSelectionHref()} className="button-secondary">
            Fermer le panneau
          </Link>
        )}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr),420px]">
        <section className="space-y-4">
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

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <section className="workbench-panel">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="panel-title">
                  {selectedVendor ? "Éditer le prestataire" : "Nouveau prestataire"}
                </h2>
                <p className="panel-caption">
                  {selectedVendor ? "Ajuste ici la fiche du prestataire sélectionné." : "Sélectionne un prestataire ou crée-en un nouveau."}
                </p>
              </div>
              {selectedVendor && <VendorDeleteButton vendorId={selectedVendor.id} />}
            </div>
            <VendorForm
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
        </aside>
      </div>
    </div>
  );
}
