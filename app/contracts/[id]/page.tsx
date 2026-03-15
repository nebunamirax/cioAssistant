import Link from "next/link";
import { ContractDeleteButton } from "@/components/contracts/contract-delete-button";
import { ContractForm } from "@/components/contracts/contract-form";
import { CONTRACT_STATUSES, RENEWAL_TYPES } from "@/lib/domain/constants";
import { prisma } from "@/lib/db/prisma";
import { getContractById } from "@/lib/services/contract-service";
import { notFound } from "next/navigation";

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(value) : "—";
}

export default async function ContractDetailPage({ params }: { params: { id: string } }) {
  const [contract, vendors, projects] = await Promise.all([
    getContractById(params.id),
    prisma.vendor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } })
  ]);

  if (!contract) return notFound();

  const status = CONTRACT_STATUSES.includes(contract.status as (typeof CONTRACT_STATUSES)[number])
    ? (contract.status as (typeof CONTRACT_STATUSES)[number])
    : "DRAFT";
  const renewalType = RENEWAL_TYPES.includes(contract.renewalType as (typeof RENEWAL_TYPES)[number])
    ? (contract.renewalType as (typeof RENEWAL_TYPES)[number])
    : "NONE";
  const vendorOptions = vendors.map((vendor) => ({ id: vendor.id, label: vendor.name }));
  const projectOptions = projects.map((project) => ({ id: project.id, label: project.title }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/contracts" className="text-sm text-slate-600 hover:underline">
            Retour aux contrats
          </Link>
          <h1 className="text-2xl font-semibold">{contract.title}</h1>
        </div>
        <ContractDeleteButton contractId={contract.id} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr),minmax(280px,1fr)]">
        <ContractForm
          mode="edit"
          contractId={contract.id}
          vendorOptions={vendorOptions}
          projectOptions={projectOptions}
          initialValues={{
            vendorId: contract.vendorId,
            projectId: contract.projectId ?? "",
            title: contract.title,
            contractType: contract.contractType ?? "",
            status,
            startDate: contract.startDate ? new Date(contract.startDate).toISOString().slice(0, 16) : "",
            endDate: contract.endDate ? new Date(contract.endDate).toISOString().slice(0, 16) : "",
            noticePeriodDays: contract.noticePeriodDays?.toString() ?? "",
            amountPlanned: contract.amountPlanned?.toString() ?? "",
            notes: contract.notes ?? "",
            renewalType
          }}
        />
        <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <h2 className="font-semibold text-slate-900">Synthèse</h2>
          <p><strong>Prestataire:</strong> {contract.vendor.name}</p>
          <p><strong>Projet:</strong> {contract.project?.title ?? "—"}</p>
          <p><strong>Actions:</strong> {contract._count.actions}</p>
          <p><strong>Budget:</strong> {contract._count.budgetItems}</p>
          <p><strong>Communications:</strong> {contract._count.communications}</p>
          <p><strong>Services:</strong> {contract._count.supportServices}</p>
          <p><strong>Début:</strong> {formatDate(contract.startDate)}</p>
          <p><strong>Fin:</strong> {formatDate(contract.endDate)}</p>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">Actions liées</h2>
          <div className="space-y-2 text-sm text-slate-700">
            {contract.actions.map((action) => (
              <p key={action.id}>
                <Link href={`/actions/${action.id}`} className="font-medium text-slate-900 hover:underline">
                  {action.title}
                </Link>{" "}
                · {action.status}
              </p>
            ))}
            {contract.actions.length === 0 && <p className="text-slate-500">Aucune action liée.</p>}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">Services liés</h2>
          <div className="space-y-2 text-sm text-slate-700">
            {contract.supportServices.map((service) => (
              <p key={service.id}>
                {service.title} {service.criticality ? `· ${service.criticality}` : ""}
              </p>
            ))}
            {contract.supportServices.length === 0 && <p className="text-slate-500">Aucun service lié.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
