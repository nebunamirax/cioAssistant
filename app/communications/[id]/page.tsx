import Link from "next/link";
import { CommunicationDeleteButton } from "@/components/communications/communication-delete-button";
import { CommunicationForm } from "@/components/communications/communication-form";
import { getCommunicationTemplate } from "@/lib/communications/templates";
import { COMMUNICATION_STATUSES } from "@/lib/domain/constants";
import { prisma } from "@/lib/db/prisma";
import { getCommunicationById } from "@/lib/services/communication-service";
import { notFound } from "next/navigation";

export default async function CommunicationDetailPage({ params }: { params: { id: string } }) {
  const [communication, projects, actions, contracts] = await Promise.all([
    getCommunicationById(params.id),
    prisma.project.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.action.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.contract.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } })
  ]);

  if (!communication) return notFound();

  const status = COMMUNICATION_STATUSES.includes(communication.status as (typeof COMMUNICATION_STATUSES)[number])
    ? (communication.status as (typeof COMMUNICATION_STATUSES)[number])
    : "DRAFT";
  const templateKey = getCommunicationTemplate(communication.templateKey)?.key ?? "";
  const projectOptions = projects.map((project) => ({ id: project.id, label: project.title }));
  const actionOptions = actions.map((action) => ({ id: action.id, label: action.title }));
  const contractOptions = contracts.map((contract) => ({ id: contract.id, label: contract.title }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/communications" className="text-sm text-slate-600 hover:underline">
            Retour aux communications
          </Link>
          <h1 className="text-2xl font-semibold">{communication.title}</h1>
        </div>
        <CommunicationDeleteButton communicationId={communication.id} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr),minmax(280px,1fr)]">
        <CommunicationForm
          mode="edit"
          communicationId={communication.id}
          projectOptions={projectOptions}
          actionOptions={actionOptions}
          contractOptions={contractOptions}
          initialValues={{
            title: communication.title,
            type: communication.type ?? "",
            status,
            templateKey,
            templateInputData: communication.templateInputData ?? {},
            contentText: communication.contentText ?? "",
            contentMarkdown: communication.contentMarkdown ?? "",
            projectId: communication.projectId ?? "",
            actionId: communication.actionId ?? "",
            contractId: communication.contractId ?? ""
          }}
        />
        <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <h2 className="font-semibold text-slate-900">Synthèse</h2>
          <p><strong>Statut:</strong> {communication.status}</p>
          <p><strong>Type:</strong> {communication.type ?? "—"}</p>
          <p><strong>Template:</strong> {getCommunicationTemplate(communication.templateKey)?.label ?? "—"}</p>
          <p><strong>Projet:</strong> {communication.project?.title ?? "—"}</p>
          <p><strong>Action:</strong> {communication.action?.title ?? "—"}</p>
          <p><strong>Contrat:</strong> {communication.contract?.title ?? "—"}</p>
          <p>
            <a
              href={`/api/export/markdown?communicationId=${communication.id}`}
              className="text-slate-900 hover:underline"
            >
              Exporter en Markdown
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
