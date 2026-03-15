import Link from "next/link";
import { ContractFilters } from "@/components/contracts/contract-filters";
import { ContractForm } from "@/components/contracts/contract-form";
import { CONTRACT_STATUSES, RENEWAL_TYPES } from "@/lib/domain/constants";
import { prisma } from "@/lib/db/prisma";
import { listContracts } from "@/lib/services/contract-service";
import type { ContractFilters as ContractFiltersInput } from "@/lib/validation/contract";

type ContractsPageProps = {
  searchParams?: {
    search?: string;
    status?: string;
    renewalType?: string;
    expiringOnly?: string;
  };
};

type ContractStatusValue = NonNullable<ContractFiltersInput["status"]>;
type RenewalTypeValue = NonNullable<ContractFiltersInput["renewalType"]>;

function isContractStatus(value: string): value is ContractStatusValue {
  return CONTRACT_STATUSES.includes(value as (typeof CONTRACT_STATUSES)[number]);
}

function isRenewalType(value: string): value is RenewalTypeValue {
  return RENEWAL_TYPES.includes(value as (typeof RENEWAL_TYPES)[number]);
}

export default async function ContractsPage({ searchParams }: ContractsPageProps) {
  const status: ContractFiltersInput["status"] = searchParams?.status && isContractStatus(searchParams.status)
    ? searchParams.status
    : undefined;
  const renewalType: ContractFiltersInput["renewalType"] = searchParams?.renewalType && isRenewalType(searchParams.renewalType)
    ? searchParams.renewalType
    : undefined;
  const filters: ContractFiltersInput = {
    search: searchParams?.search,
    status,
    renewalType,
    expiringOnly: searchParams?.expiringOnly === "true"
  };

  const [contracts, vendors, projects] = await Promise.all([
    listContracts(filters),
    prisma.vendor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } })
  ]);

  const vendorOptions = vendors.map((vendor) => ({ id: vendor.id, label: vendor.name }));
  const projectOptions = projects.map((project) => ({ id: project.id, label: project.title }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Contrats</h1>
      <ContractFilters values={filters} />
      <ContractForm vendorOptions={vendorOptions} projectOptions={projectOptions} />
      <div className="rounded-lg border border-slate-200 bg-white">
        <table className="w-full table-auto text-sm">
          <thead className="bg-slate-100 text-left text-slate-700">
            <tr>
              <th className="p-3">Titre</th>
              <th className="p-3">Prestataire</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Renouvellement</th>
              <th className="p-3">Échéance</th>
              <th className="p-3">Actions</th>
              <th className="p-3">Modifier</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((contract) => (
              <tr key={contract.id} className="border-t border-slate-100">
                <td className="p-3">
                  <Link href={`/contracts/${contract.id}`} className="font-medium text-slate-900 hover:underline">
                    {contract.title}
                  </Link>
                </td>
                <td className="p-3">{contract.vendor.name}</td>
                <td className="p-3">{contract.status}</td>
                <td className="p-3">{contract.renewalType}</td>
                <td className="p-3">{contract.endDate ? new Intl.DateTimeFormat("fr-FR").format(contract.endDate) : "—"}</td>
                <td className="p-3">{contract._count.actions}</td>
                <td className="p-3">
                  <Link href={`/contracts/${contract.id}`} className="text-slate-900 hover:underline">
                    Modifier
                  </Link>
                </td>
              </tr>
            ))}
            {contracts.length === 0 && (
              <tr>
                <td colSpan={7} className="p-3 text-slate-500">
                  Aucun contrat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
