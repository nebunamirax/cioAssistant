import Link from "next/link";
import { ContractDeleteButton } from "@/components/contracts/contract-delete-button";
import { ContractFilters } from "@/components/contracts/contract-filters";
import { ContractForm } from "@/components/contracts/contract-form";
import { CONTRACT_STATUSES, RENEWAL_TYPES } from "@/lib/domain/constants";
import { prisma } from "@/lib/db/prisma";
import { getContractById, listContracts } from "@/lib/services/contract-service";
import type { ContractFilters as ContractFiltersInput } from "@/lib/validation/contract";

type ContractsPageProps = {
  searchParams?: {
    search?: string;
    status?: string;
    renewalType?: string;
    expiringOnly?: string;
    selectedId?: string;
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
  const selectedContract = searchParams?.selectedId ? await getContractById(searchParams.selectedId) : null;

  const vendorOptions = vendors.map((vendor) => ({ id: vendor.id, label: vendor.name }));
  const projectOptions = projects.map((project) => ({ id: project.id, label: project.title }));
  const baseParams = new URLSearchParams();

  if (searchParams?.search) baseParams.set("search", searchParams.search);
  if (status) baseParams.set("status", status);
  if (renewalType) baseParams.set("renewalType", renewalType);
  if (searchParams?.expiringOnly === "true") baseParams.set("expiringOnly", "true");

  const buildSelectionHref = (selectedId?: string) => {
    const params = new URLSearchParams(baseParams);

    if (selectedId) {
      params.set("selectedId", selectedId);
    }

    const query = params.toString();
    return query ? `/contracts?${query}` : "/contracts";
  };

  return (
    <div className="space-y-4">
      <div className="workbench-header">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Contrats</h1>
          <p className="text-sm text-slate-600">Garde les échéances, rattachements et modifications contractuelles dans le même poste de travail.</p>
          <div className="workbench-kpi-grid">
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Contrats</div>
              <div className="workbench-kpi-value">{contracts.length}</div>
            </div>
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Sélection</div>
              <div className="workbench-kpi-value">{selectedContract ? "1" : "0"}</div>
            </div>
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Échéance</div>
              <div className="workbench-kpi-value">{selectedContract?.endDate ? new Intl.DateTimeFormat("fr-FR").format(selectedContract.endDate) : "—"}</div>
            </div>
          </div>
        </div>
        {selectedContract && (
          <Link href={buildSelectionHref()} className="button-secondary">
            Fermer le panneau
          </Link>
        )}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr),460px]">
        <section className="space-y-4">
          <ContractFilters values={filters} />
          <div className="workbench-table-shell">
            <table className="workbench-table">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Prestataire</th>
                  <th>Statut</th>
                  <th>Renouvellement</th>
                  <th>Échéance</th>
                  <th>Actions</th>
                  <th>Modifier</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.id} data-selected={searchParams?.selectedId === contract.id}>
                    <td>
                      <Link href={buildSelectionHref(contract.id)} className="font-medium text-slate-900 hover:underline">
                        {contract.title}
                      </Link>
                    </td>
                    <td>{contract.vendor.name}</td>
                    <td>{contract.status}</td>
                    <td>{contract.renewalType}</td>
                    <td>{contract.endDate ? new Intl.DateTimeFormat("fr-FR").format(contract.endDate) : "—"}</td>
                    <td>{contract._count.actions}</td>
                    <td>
                      <Link href={buildSelectionHref(contract.id)} className="text-slate-900 hover:underline">
                        Modifier
                      </Link>
                    </td>
                  </tr>
                ))}
                {contracts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-slate-500">
                      Aucun contrat.
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
                  {selectedContract ? "Éditer le contrat" : "Nouveau contrat"}
                </h2>
                <p className="panel-caption">
                  {selectedContract ? "Les champs ci-dessous sont déjà renseignés avec les données du contrat." : "Crée un contrat ou sélectionne une ligne pour le modifier."}
                </p>
              </div>
              {selectedContract && <ContractDeleteButton contractId={selectedContract.id} />}
            </div>
            <ContractForm
              mode={selectedContract ? "edit" : "create"}
              contractId={selectedContract?.id}
              vendorOptions={vendorOptions}
              projectOptions={projectOptions}
              initialValues={selectedContract ? {
                vendorId: selectedContract.vendorId,
                projectId: selectedContract.projectId ?? "",
                title: selectedContract.title,
                contractType: selectedContract.contractType ?? "",
                status: CONTRACT_STATUSES.includes(selectedContract.status as (typeof CONTRACT_STATUSES)[number]) ? (selectedContract.status as (typeof CONTRACT_STATUSES)[number]) : "DRAFT",
                startDate: selectedContract.startDate ? new Date(selectedContract.startDate).toISOString().slice(0, 16) : "",
                endDate: selectedContract.endDate ? new Date(selectedContract.endDate).toISOString().slice(0, 16) : "",
                noticePeriodDays: selectedContract.noticePeriodDays?.toString() ?? "",
                amountPlanned: selectedContract.amountPlanned?.toString() ?? "",
                notes: selectedContract.notes ?? "",
                renewalType: RENEWAL_TYPES.includes(selectedContract.renewalType as (typeof RENEWAL_TYPES)[number]) ? (selectedContract.renewalType as (typeof RENEWAL_TYPES)[number]) : "NONE"
              } : undefined}
              showHeader={false}
            />
          </section>

          {selectedContract && (
            <section className="workbench-panel panel-stat-list">
              <h3 className="panel-title">Synthèse</h3>
              <p><strong>Prestataire:</strong> {selectedContract.vendor.name}</p>
              <p><strong>Projet:</strong> {selectedContract.project?.title ?? "—"}</p>
              <p><strong>Actions:</strong> {selectedContract._count.actions}</p>
              <p><strong>Budget:</strong> {selectedContract._count.budgetItems}</p>
              <p><strong>Communications:</strong> {selectedContract._count.communications}</p>
              <p><strong>Services:</strong> {selectedContract._count.supportServices}</p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
