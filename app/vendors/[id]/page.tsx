import Link from "next/link";
import { VendorDeleteButton } from "@/components/vendors/vendor-delete-button";
import { VendorForm } from "@/components/vendors/vendor-form";
import { getVendorById } from "@/lib/services/vendor-service";
import { notFound } from "next/navigation";

export default async function VendorDetailPage({ params }: { params: { id: string } }) {
  const vendor = await getVendorById(params.id);

  if (!vendor) return notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/vendors" className="text-sm text-slate-600 hover:underline">
            Retour aux prestataires
          </Link>
          <h1 className="text-2xl font-semibold">{vendor.name}</h1>
        </div>
        <VendorDeleteButton vendorId={vendor.id} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr),minmax(280px,1fr)]">
        <VendorForm
          mode="edit"
          vendorId={vendor.id}
          initialValues={{
            name: vendor.name,
            category: vendor.category ?? "",
            mainContactName: vendor.mainContactName ?? "",
            mainContactEmail: vendor.mainContactEmail ?? "",
            notes: vendor.notes ?? ""
          }}
        />
        <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <h2 className="font-semibold text-slate-900">Synthèse</h2>
          <p><strong>Contrats:</strong> {vendor._count.contracts}</p>
          <p><strong>Actions:</strong> {vendor._count.actions}</p>
          <p><strong>Services:</strong> {vendor._count.supportServices}</p>
          <p><strong>Budget:</strong> {vendor._count.budgetItems}</p>
          <p><strong>Email:</strong> {vendor.mainContactEmail ?? "—"}</p>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">Contrats liés</h2>
          <div className="space-y-2 text-sm text-slate-700">
            {vendor.contracts.map((contract) => (
              <p key={contract.id}>
                <Link href={`/contracts/${contract.id}`} className="font-medium text-slate-900 hover:underline">
                  {contract.title}
                </Link>{" "}
                · {contract.status}
              </p>
            ))}
            {vendor.contracts.length === 0 && <p className="text-slate-500">Aucun contrat lié.</p>}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">Actions liées</h2>
          <div className="space-y-2 text-sm text-slate-700">
            {vendor.actions.map((action) => (
              <p key={action.id}>
                <Link href={`/actions/${action.id}`} className="font-medium text-slate-900 hover:underline">
                  {action.title}
                </Link>{" "}
                · {action.status}
              </p>
            ))}
            {vendor.actions.length === 0 && <p className="text-slate-500">Aucune action liée.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
