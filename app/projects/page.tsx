import Link from "next/link";
import { projectTypeLabels, priorityLabels } from "@/lib/domain/display-labels";
import { prisma } from "@/lib/db/prisma";
import { pilotageDate, projectLabels } from "@/lib/services/pilotage-service";
import { ProjectDeleteButton } from "@/components/projects/project-delete-button";
import { ProjectFilters } from "@/components/projects/project-filters";
import { ProjectForm } from "@/components/projects/project-form";
import { PRIORITIES, PROJECT_STATUSES, PROJECT_TYPES } from "@/lib/domain/constants";
import { getProjectById, listProjects } from "@/lib/services/project-service";
import type { ProjectFilters as ProjectFiltersInput } from "@/lib/validation/project";

type ProjectsPageProps = {
  searchParams?: Promise<{
    search?: string;
    type?: string;
    status?: string;
    priority?: string;
    selectedId?: string;
    new?: string;
  }>;
};

type ProjectTypeValue = NonNullable<ProjectFiltersInput["type"]>;
type ProjectStatusValue = NonNullable<ProjectFiltersInput["status"]>;
type ProjectPriorityValue = NonNullable<ProjectFiltersInput["priority"]>;

function isProjectType(value: string): value is ProjectTypeValue {
  return PROJECT_TYPES.includes(value as (typeof PROJECT_TYPES)[number]);
}

function isProjectStatus(value: string): value is ProjectStatusValue {
  return PROJECT_STATUSES.includes(value as (typeof PROJECT_STATUSES)[number]);
}

function isPriority(value: string): value is ProjectPriorityValue {
  return PRIORITIES.includes(value as (typeof PRIORITIES)[number]);
}

export default async function ProjectsPage({ searchParams: searchParamsPromise }: ProjectsPageProps) {
  const searchParams = await searchParamsPromise;
  const type: ProjectFiltersInput["type"] = searchParams?.type && isProjectType(searchParams.type) ? searchParams.type : undefined;
  const status: ProjectFiltersInput["status"] = searchParams?.status && isProjectStatus(searchParams.status) ? searchParams.status : undefined;
  const priority: ProjectFiltersInput["priority"] = searchParams?.priority && isPriority(searchParams.priority) ? searchParams.priority : undefined;
  const search = typeof searchParams?.search === "string" ? searchParams.search : undefined;
  const selectedId = typeof searchParams?.selectedId === "string" ? searchParams.selectedId : undefined;
  const filters: ProjectFiltersInput = {
    search,
    type,
    status,
    priority
  };
  const [projects, selectedProject, owners] = await Promise.all([
    listProjects(filters),
    selectedId ? getProjectById(selectedId) : null,
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
  ]);
  const ownerNames = new Map(owners.map((owner) => [owner.id, owner.name]));
  const baseParams = new URLSearchParams();

  if (search) baseParams.set("search", search);
  if (type) baseParams.set("type", type);
  if (status) baseParams.set("status", status);
  if (priority) baseParams.set("priority", priority);

  const panelOpen = Boolean(selectedProject || searchParams?.new === "1");

  const buildSelectionHref = (selectedId?: string, create = false) => {
    const params = new URLSearchParams(baseParams);

    if (selectedId) {
      params.set("selectedId", selectedId);
    } else if (create) {
      params.set("new", "1");
    }

    const query = params.toString();
    return query ? `/projects?${query}` : "/projects";
  };

  return (
    <div className="space-y-4">
      <div className="workbench-header">
        <div className="space-y-2">
          <h1 className="workspace-page-title">Projets</h1>
          <p className="text-sm text-slate-600">{projects.length} {projects.length === 1 ? "projet affiché" : "projets affichés"}</p>
        </div>
        {panelOpen ? (
          <Link href={buildSelectionHref()} className="button-secondary">
            Fermer
          </Link>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Link href="/roadmap" className="button-secondary">Voir la roadmap</Link>
            <Link href={buildSelectionHref(undefined, true)} className="button-primary">Nouveau projet</Link>
          </div>
        )}
      </div>
      <div className={panelOpen ? "workspace-split" : "space-y-4"}>
        <section className="min-w-0 space-y-4">
          <ProjectFilters key={baseParams.toString()} values={filters} />
          <div className="workbench-table-shell">
            <ul className="workspace-feed border-t-0 sm:hidden" aria-label="Projets">
              {projects.map((project) => <li key={project.id} className="workspace-feed-row">
                <Link href={`/projects/${encodeURIComponent(project.id)}`} className="workspace-feed-text">
                  <strong>{project.title}</strong>
                  <span>{[projectLabels[project.status] ?? project.status, project.targetDate && pilotageDate(project.targetDate)].filter(Boolean).join(" · ")}</span>
                </Link>
                <Link href={buildSelectionHref(project.id)} className="workspace-panel-link" aria-label={`Modifier ${project.title}`}>Modifier</Link>
              </li>)}
              {!projects.length && <li className="workspace-empty">Aucun projet.</li>}
            </ul>
            <table className="workbench-table hidden sm:table">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Type</th>
                  <th>Statut</th>
                  <th>Priorité</th>
                  <th>Cible</th>
                  <th>Responsable</th>
                  <th>Actions</th>
                  <th>Modifier</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} data-selected={selectedId === project.id}>
                    <td>
                      <Link href={`/projects/${project.id}`} className="pilot-row-link">
                        {project.title}
                      </Link>
                    </td>
                    <td>{projectTypeLabels[project.type] ?? project.type}</td>
                    <td><span className="pilot-status" data-status={project.status}>{projectLabels[project.status] ?? project.status}</span></td>
                    <td>{priorityLabels[project.priority] ?? project.priority}</td>
                    <td>{pilotageDate(project.targetDate)}</td>
                    <td>{(project.ownerId && ownerNames.get(project.ownerId)) || "À attribuer"}</td>
                    <td>{project._count.actions}</td>
                    <td>
                      <Link href={buildSelectionHref(project.id)} className="text-slate-900 hover:underline">
                        Modifier
                      </Link>
                    </td>
                  </tr>
                ))}
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-slate-500">
                      Aucun projet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {panelOpen && <aside className="order-first min-w-0 space-y-4 xl:order-none">
          <section className="workbench-panel">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="panel-title">
                  {selectedProject ? "Modifier le projet" : "Nouveau projet"}
                </h2>
              </div>
              {selectedProject && <ProjectDeleteButton projectId={selectedProject.id} />}
            </div>
            <ProjectForm key={selectedProject?.id ?? "new"} owners={owners}
              mode={selectedProject ? "edit" : "create"}
              projectId={selectedProject?.id}
              initialValues={selectedProject ? {
                title: selectedProject.title,
                ownerId: selectedProject.ownerId,
                description: selectedProject.description ?? "",
                type: PROJECT_TYPES.includes(selectedProject.type as (typeof PROJECT_TYPES)[number]) ? (selectedProject.type as (typeof PROJECT_TYPES)[number]) : "DEVELOPMENT",
                status: PROJECT_STATUSES.includes(selectedProject.status as (typeof PROJECT_STATUSES)[number]) ? (selectedProject.status as (typeof PROJECT_STATUSES)[number]) : "DRAFT",
                priority: PRIORITIES.includes(selectedProject.priority as (typeof PRIORITIES)[number]) ? (selectedProject.priority as (typeof PRIORITIES)[number]) : "NORMAL",
                startDate: selectedProject.startDate ? new Date(selectedProject.startDate).toISOString().slice(0, 16) : "",
                targetDate: selectedProject.targetDate ? new Date(selectedProject.targetDate).toISOString().slice(0, 16) : ""
              } : undefined}
              showHeader={false}
            />
          </section>

          {selectedProject && (
            <>
              <section className="workbench-panel panel-stat-list">
                <h3 className="panel-title">Synthèse</h3>
                <p><strong>Actions:</strong> {selectedProject._count.actions}</p>
                <p><strong>Contrats:</strong> {selectedProject._count.contracts}</p>
                <p><strong>Budget:</strong> {selectedProject._count.budgetItems}</p>
                <p><strong>Communications:</strong> {selectedProject._count.communications}</p>
                <p><strong>Réunions:</strong> {selectedProject._count.meetingNotes}</p>
              </section>
              <section className="workbench-panel">
                <h3 className="panel-title">Liens métier</h3>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  {selectedProject.actions.slice(0, 4).map((action) => (
                    <p key={action.id}>
                      <Link href={`/actions/${action.id}`} className="font-medium text-slate-900 hover:underline">
                        {action.title}
                      </Link>{" "}
                      · {action.status}
                    </p>
                  ))}
                  {selectedProject.actions.length === 0 && <p className="text-slate-500">Aucune action liée.</p>}
                </div>
              </section>
            </>
          )}
        </aside>}
      </div>
    </div>
  );
}
