import Link from "next/link";
import { CommunicationDeleteButton } from "@/components/communications/communication-delete-button";
import { CommunicationFilters } from "@/components/communications/communication-filters";
import { CommunicationForm } from "@/components/communications/communication-form";
import { getCommunicationTemplate } from "@/lib/communications/templates";
import { COMMUNICATION_STATUSES } from "@/lib/domain/constants";
import { prisma } from "@/lib/db/prisma";
import { getCommunicationById, listCommunications } from "@/lib/services/communication-service";
import type { CommunicationFilters as CommunicationFiltersInput } from "@/lib/validation/communication";

type CommunicationsPageProps = {
  searchParams?: {
    search?: string;
    status?: string;
    type?: string;
    projectId?: string;
    actionId?: string;
    contractId?: string;
    selectedId?: string;
  };
};

type CommunicationStatusValue = NonNullable<CommunicationFiltersInput["status"]>;

function isCommunicationStatus(value: string): value is CommunicationStatusValue {
  return COMMUNICATION_STATUSES.includes(value as (typeof COMMUNICATION_STATUSES)[number]);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export default async function CommunicationsPage({ searchParams }: CommunicationsPageProps) {
  const status: CommunicationFiltersInput["status"] = searchParams?.status && isCommunicationStatus(searchParams.status)
    ? searchParams.status
    : undefined;
  const filters: CommunicationFiltersInput = {
    search: searchParams?.search,
    status,
    type: searchParams?.type,
    projectId: searchParams?.projectId,
    actionId: searchParams?.actionId,
    contractId: searchParams?.contractId
  };

  const [communications, projects, actions, contracts, selectedCommunication] = await Promise.all([
    listCommunications(filters),
    prisma.project.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.action.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.contract.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    searchParams?.selectedId ? getCommunicationById(searchParams.selectedId) : null
  ]);

  const projectOptions = projects.map((project) => ({ id: project.id, label: project.title }));
  const actionOptions = actions.map((action) => ({ id: action.id, label: action.title }));
  const contractOptions = contracts.map((contract) => ({ id: contract.id, label: contract.title }));
  const baseParams = new URLSearchParams();

  if (searchParams?.search) baseParams.set("search", searchParams.search);
  if (status) baseParams.set("status", status);
  if (searchParams?.type) baseParams.set("type", searchParams.type);
  if (searchParams?.projectId) baseParams.set("projectId", searchParams.projectId);
  if (searchParams?.actionId) baseParams.set("actionId", searchParams.actionId);
  if (searchParams?.contractId) baseParams.set("contractId", searchParams.contractId);

  const buildSelectionHref = (selectedId?: string) => {
    const params = new URLSearchParams(baseParams);

    if (selectedId) {
      params.set("selectedId", selectedId);
    }

    const query = params.toString();
    return query ? `/communications?${query}` : "/communications";
  };

  return (
    <div className="space-y-4">
      <div className="workbench-header">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Communications</h1>
          <p className="text-sm text-slate-600">Rédige, contextualise et exporte les communications sans sortir de la vue portefeuille.</p>
          <div className="workbench-kpi-grid">
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Communications</div>
              <div className="workbench-kpi-value">{communications.length}</div>
            </div>
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Template</div>
              <div className="workbench-kpi-value">{selectedCommunication ? (getCommunicationTemplate(selectedCommunication.templateKey)?.label ?? "Libre") : "—"}</div>
            </div>
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Sélection</div>
              <div className="workbench-kpi-value">{selectedCommunication ? "1" : "0"}</div>
            </div>
          </div>
        </div>
        {selectedCommunication && (
          <Link href={buildSelectionHref()} className="button-secondary">
            Fermer le panneau
          </Link>
        )}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr),460px]">
        <section className="space-y-4">
          <CommunicationFilters
            values={filters}
            projectOptions={projectOptions}
            actionOptions={actionOptions}
            contractOptions={contractOptions}
          />
          <div className="workbench-table-shell">
            <table className="workbench-table">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Statut</th>
                  <th>Type / template</th>
                  <th>Liens</th>
                  <th>Mise à jour</th>
                  <th>Export</th>
                  <th>Modifier</th>
                </tr>
              </thead>
              <tbody>
                {communications.map((communication) => (
                  <tr key={communication.id} data-selected={searchParams?.selectedId === communication.id}>
                    <td>
                      <Link href={buildSelectionHref(communication.id)} className="font-medium text-slate-900 hover:underline">
                        {communication.title}
                      </Link>
                    </td>
                    <td>{communication.status}</td>
                    <td>
                      <div>{communication.type ?? "—"}</div>
                      <div className="text-xs text-slate-500">
                        {getCommunicationTemplate(communication.templateKey)?.label ?? "Sans template"}
                      </div>
                    </td>
                    <td>
                      <div>{communication.project?.title ? `Projet: ${communication.project.title}` : "Projet: —"}</div>
                      <div>{communication.action?.title ? `Action: ${communication.action.title}` : "Action: —"}</div>
                      <div>{communication.contract?.title ? `Contrat: ${communication.contract.title}` : "Contrat: —"}</div>
                    </td>
                    <td>{formatDate(communication.updatedAt)}</td>
                    <td>
                      <a
                        href={`/api/export/markdown?communicationId=${communication.id}`}
                        className="text-slate-900 hover:underline"
                      >
                        Markdown
                      </a>
                    </td>
                    <td>
                      <Link href={buildSelectionHref(communication.id)} className="text-slate-900 hover:underline">
                        Modifier
                      </Link>
                    </td>
                  </tr>
                ))}
                {communications.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-slate-500">
                      Aucune communication.
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
                  {selectedCommunication ? "Éditer la communication" : "Nouvelle communication"}
                </h2>
                <p className="panel-caption">
                  {selectedCommunication ? "Retouche le brouillon existant directement dans les champs préremplis." : "Rédige un brouillon ou ajuste un template sans quitter la liste."}
                </p>
              </div>
              {selectedCommunication && <CommunicationDeleteButton communicationId={selectedCommunication.id} />}
            </div>
            <CommunicationForm
              mode={selectedCommunication ? "edit" : "create"}
              communicationId={selectedCommunication?.id}
              projectOptions={projectOptions}
              actionOptions={actionOptions}
              contractOptions={contractOptions}
              initialValues={selectedCommunication ? {
                title: selectedCommunication.title,
                type: selectedCommunication.type ?? "",
                status: COMMUNICATION_STATUSES.includes(selectedCommunication.status as (typeof COMMUNICATION_STATUSES)[number])
                  ? (selectedCommunication.status as (typeof COMMUNICATION_STATUSES)[number])
                  : "DRAFT",
                templateKey: selectedCommunication.templateKey ?? "",
                templateInputData: selectedCommunication.templateInputData ?? {},
                contentText: selectedCommunication.contentText ?? "",
                contentMarkdown: selectedCommunication.contentMarkdown ?? "",
                projectId: selectedCommunication.projectId ?? "",
                actionId: selectedCommunication.actionId ?? "",
                contractId: selectedCommunication.contractId ?? ""
              } : undefined}
              showHeader={false}
            />
          </section>

          {selectedCommunication && (
            <section className="workbench-panel panel-stat-list">
              <h3 className="panel-title">Synthèse</h3>
              <p><strong>Template:</strong> {getCommunicationTemplate(selectedCommunication.templateKey)?.label ?? "—"}</p>
              <p><strong>Projet:</strong> {selectedCommunication.project?.title ?? "—"}</p>
              <p><strong>Action:</strong> {selectedCommunication.action?.title ?? "—"}</p>
              <p><strong>Contrat:</strong> {selectedCommunication.contract?.title ?? "—"}</p>
              <p>
                <a
                  href={`/api/export/markdown?communicationId=${selectedCommunication.id}`}
                  className="text-slate-900 hover:underline"
                >
                  Exporter en Markdown
                </a>
              </p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
