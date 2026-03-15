import Link from "next/link";
import { CommunicationFilters } from "@/components/communications/communication-filters";
import { CommunicationForm } from "@/components/communications/communication-form";
import { getCommunicationTemplate } from "@/lib/communications/templates";
import { COMMUNICATION_STATUSES } from "@/lib/domain/constants";
import { prisma } from "@/lib/db/prisma";
import { listCommunications } from "@/lib/services/communication-service";
import type { CommunicationFilters as CommunicationFiltersInput } from "@/lib/validation/communication";

type CommunicationsPageProps = {
  searchParams?: {
    search?: string;
    status?: string;
    type?: string;
    projectId?: string;
    actionId?: string;
    contractId?: string;
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

  const [communications, projects, actions, contracts] = await Promise.all([
    listCommunications(filters),
    prisma.project.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.action.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.contract.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } })
  ]);

  const projectOptions = projects.map((project) => ({ id: project.id, label: project.title }));
  const actionOptions = actions.map((action) => ({ id: action.id, label: action.title }));
  const contractOptions = contracts.map((contract) => ({ id: contract.id, label: contract.title }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Communications</h1>
      <CommunicationFilters
        values={filters}
        projectOptions={projectOptions}
        actionOptions={actionOptions}
        contractOptions={contractOptions}
      />
      <CommunicationForm
        projectOptions={projectOptions}
        actionOptions={actionOptions}
        contractOptions={contractOptions}
      />
      <div className="rounded-lg border border-slate-200 bg-white">
        <table className="w-full table-auto text-sm">
          <thead className="bg-slate-100 text-left text-slate-700">
            <tr>
              <th className="p-3">Titre</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Type / template</th>
              <th className="p-3">Liens</th>
              <th className="p-3">Mise à jour</th>
              <th className="p-3">Export</th>
            </tr>
          </thead>
          <tbody>
            {communications.map((communication) => (
              <tr key={communication.id} className="border-t border-slate-100 align-top">
                <td className="p-3">
                  <Link href={`/communications/${communication.id}`} className="font-medium text-slate-900 hover:underline">
                    {communication.title}
                  </Link>
                </td>
                <td className="p-3">{communication.status}</td>
                <td className="p-3">
                  <div>{communication.type ?? "—"}</div>
                  <div className="text-xs text-slate-500">
                    {getCommunicationTemplate(communication.templateKey)?.label ?? "Sans template"}
                  </div>
                </td>
                <td className="p-3 text-slate-700">
                  <div>{communication.project?.title ? `Projet: ${communication.project.title}` : "Projet: —"}</div>
                  <div>{communication.action?.title ? `Action: ${communication.action.title}` : "Action: —"}</div>
                  <div>{communication.contract?.title ? `Contrat: ${communication.contract.title}` : "Contrat: —"}</div>
                </td>
                <td className="p-3">{formatDate(communication.updatedAt)}</td>
                <td className="p-3">
                  <a
                    href={`/api/export/markdown?communicationId=${communication.id}`}
                    className="text-slate-900 hover:underline"
                  >
                    Markdown
                  </a>
                </td>
              </tr>
            ))}
            {communications.length === 0 && (
              <tr>
                <td colSpan={6} className="p-3 text-slate-500">
                  Aucune communication.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
