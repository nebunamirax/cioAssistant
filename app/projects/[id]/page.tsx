import Link from "next/link";
import { ProjectDeleteButton } from "@/components/projects/project-delete-button";
import { ProjectForm } from "@/components/projects/project-form";
import { PRIORITIES, PROJECT_STATUSES, PROJECT_TYPES } from "@/lib/domain/constants";
import { getProjectById } from "@/lib/services/project-service";
import { notFound } from "next/navigation";

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(value) : "—";
}

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const project = await getProjectById(params.id);

  if (!project) return notFound();

  const type = PROJECT_TYPES.includes(project.type as (typeof PROJECT_TYPES)[number]) ? (project.type as (typeof PROJECT_TYPES)[number]) : "DEVELOPMENT";
  const status = PROJECT_STATUSES.includes(project.status as (typeof PROJECT_STATUSES)[number]) ? (project.status as (typeof PROJECT_STATUSES)[number]) : "DRAFT";
  const priority = PRIORITIES.includes(project.priority as (typeof PRIORITIES)[number]) ? (project.priority as (typeof PRIORITIES)[number]) : "NORMAL";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/projects" className="text-sm text-slate-600 hover:underline">
            Retour aux projets
          </Link>
          <h1 className="text-2xl font-semibold">{project.title}</h1>
        </div>
        <ProjectDeleteButton projectId={project.id} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr),minmax(280px,1fr)]">
        <ProjectForm
          mode="edit"
          projectId={project.id}
          initialValues={{
            title: project.title,
            description: project.description ?? "",
            type,
            status,
            priority,
            startDate: project.startDate ? new Date(project.startDate).toISOString().slice(0, 16) : "",
            targetDate: project.targetDate ? new Date(project.targetDate).toISOString().slice(0, 16) : ""
          }}
        />
        <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <h2 className="font-semibold text-slate-900">Synthèse</h2>
          <p><strong>Actions:</strong> {project._count.actions}</p>
          <p><strong>Contrats:</strong> {project._count.contracts}</p>
          <p><strong>Budget:</strong> {project._count.budgetItems}</p>
          <p><strong>Communications:</strong> {project._count.communications}</p>
          <p><strong>Réunions:</strong> {project._count.meetingNotes}</p>
          <p><strong>Créé le:</strong> {formatDate(project.createdAt)}</p>
          <p><strong>Mis à jour le:</strong> {formatDate(project.updatedAt)}</p>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">Actions liées</h2>
          <div className="space-y-2 text-sm text-slate-700">
            {project.actions.map((action) => (
              <p key={action.id}>
                <Link href={`/actions/${action.id}`} className="font-medium text-slate-900 hover:underline">
                  {action.title}
                </Link>{" "}
                · {action.status}
              </p>
            ))}
            {project.actions.length === 0 && <p className="text-slate-500">Aucune action liée.</p>}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">Contrats liés</h2>
          <div className="space-y-2 text-sm text-slate-700">
            {project.contracts.map((contract) => (
              <p key={contract.id}>
                {contract.title} · {contract.status}
              </p>
            ))}
            {project.contracts.length === 0 && <p className="text-slate-500">Aucun contrat lié.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
