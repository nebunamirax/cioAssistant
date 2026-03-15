import Link from "next/link";
import { VendorFilters } from "@/components/vendors/vendor-filters";
import { VendorForm } from "@/components/vendors/vendor-form";
import { listVendors } from "@/lib/services/vendor-service";
import type { VendorFilters as VendorFiltersInput } from "@/lib/validation/vendor";

type VendorsPageProps = {
  searchParams?: {
    search?: string;
    category?: string;
  };
};

export default async function VendorsPage({ searchParams }: VendorsPageProps) {
  const filters: VendorFiltersInput = {
    search: searchParams?.search,
    category: searchParams?.category
  };
  const vendors = await listVendors(filters);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Prestataires</h1>
      <VendorFilters values={filters} />
      <VendorForm />
      <div className="rounded-lg border border-slate-200 bg-white">
        <table className="w-full table-auto text-sm">
          <thead className="bg-slate-100 text-left text-slate-700">
            <tr>
              <th className="p-3">Nom</th>
              <th className="p-3">Catégorie</th>
              <th className="p-3">Contact</th>
              <th className="p-3">Contrats</th>
              <th className="p-3">Actions</th>
              <th className="p-3">Modifier</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((vendor) => (
              <tr key={vendor.id} className="border-t border-slate-100">
                <td className="p-3">
                  <Link href={`/vendors/${vendor.id}`} className="font-medium text-slate-900 hover:underline">
                    {vendor.name}
                  </Link>
                </td>
                <td className="p-3">{vendor.category ?? "—"}</td>
                <td className="p-3">{vendor.mainContactName ?? vendor.mainContactEmail ?? "—"}</td>
                <td className="p-3">{vendor._count.contracts}</td>
                <td className="p-3">{vendor._count.actions}</td>
                <td className="p-3">
                  <Link href={`/vendors/${vendor.id}`} className="text-slate-900 hover:underline">
                    Modifier
                  </Link>
                </td>
              </tr>
            ))}
            {vendors.length === 0 && (
              <tr>
                <td colSpan={6} className="p-3 text-slate-500">
                  Aucun prestataire.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
