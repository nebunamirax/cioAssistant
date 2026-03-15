import Link from "next/link";
import { ProjectDeleteButton } from "@/components/projects/project-delete-button";
import { ProjectFilters } from "@/components/projects/project-filters";
import { ProjectForm } from "@/components/projects/project-form";
import { PRIORITIES, PROJECT_STATUSES, PROJECT_TYPES } from "@/lib/domain/constants";
import { getProjectById, listProjects } from "@/lib/services/project-service";
import type { ProjectFilters as ProjectFiltersInput } from "@/lib/validation/project";

type ProjectsPageProps = {
  searchParams?: {
    search?: string;
    type?: string;
    status?: string;
    priority?: string;
    selectedId?: string;
  };
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

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const type: ProjectFiltersInput["type"] = searchParams?.type && isProjectType(searchParams.type) ? searchParams.type : undefined;
  const status: ProjectFiltersInput["status"] = searchParams?.status && isProjectStatus(searchParams.status) ? searchParams.status : undefined;
  const priority: ProjectFiltersInput["priority"] = searchParams?.priority && isPriority(searchParams.priority) ? searchParams.priority : undefined;
  const filters: ProjectFiltersInput = {
    search: searchParams?.search,
    type,
    status,
    priority
  };
  const [projects, selectedProject] = await Promise.all([
    listProjects(filters),
    searchParams?.selectedId ? getProjectById(searchParams.selectedId) : null
  ]);
  const baseParams = new URLSearchParams();

  if (searchParams?.search) baseParams.set("search", searchParams.search);
  if (type) baseParams.set("type", type);
  if (status) baseParams.set("status", status);
  if (priority) baseParams.set("priority", priority);

  const buildSelectionHref = (selectedId?: string) => {
    const params = new URLSearchParams(baseParams);

    if (selectedId) {
      params.set("selectedId", selectedId);
    }

    const query = params.toString();
    return query ? `/projects?${query}` : "/projects";
  };

  return (
    <div className="space-y-4">
      <div className="workbench-header">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Projets</h1>
          <p className="text-sm text-slate-600">Orchestre le portefeuille projet dans un poste de pilotage unique, sans navigation en cascade.</p>
          <div className="workbench-kpi-grid">
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Portefeuille</div>
              <div className="workbench-kpi-value">{projects.length}</div>
            </div>
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Priorité haute</div>
              <div className="workbench-kpi-value">{projects.filter((project) => project.priority === "HIGH" || project.priority === "CRITICAL").length}</div>
            </div>
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Sélection</div>
              <div className="workbench-kpi-value">{selectedProject ? "1" : "0"}</div>
            </div>
          </div>
        </div>
        {selectedProject && (
          <Link href={buildSelectionHref()} className="button-secondary">
            Fermer le panneau
          </Link>
        )}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr),440px]">
        <section className="space-y-4">
          <ProjectFilters values={filters} />
          <div className="workbench-table-shell">
            <table className="workbench-table">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Type</th>
                  <th>Statut</th>
                  <th>Priorité</th>
                  <th>Cible</th>
                  <th>Actions</th>
                  <th>Modifier</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} data-selected={searchParams?.selectedId === project.id}>
                    <td>
                      <Link href={buildSelectionHref(project.id)} className="font-medium text-slate-900 hover:underline">
                        {project.title}
                      </Link>
                    </td>
                    <td>{project.type}</td>
                    <td>{project.status}</td>
                    <td>{project.priority}</td>
                    <td>{project.targetDate ? new Intl.DateTimeFormat("fr-FR").format(project.targetDate) : "—"}</td>
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
                    <td colSpan={7} className="text-slate-500">
                      Aucun projet.
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
                  {selectedProject ? "Éditer le projet" : "Nouveau projet"}
                </h2>
                <p className="panel-caption">
                  {selectedProject ? "Le formulaire reprend les données actuelles du projet sélectionné." : "Choisis un projet dans la liste ou crée-en un nouveau."}
                </p>
              </div>
              {selectedProject && <ProjectDeleteButton projectId={selectedProject.id} />}
            </div>
            <ProjectForm
              mode={selectedProject ? "edit" : "create"}
              projectId={selectedProject?.id}
              initialValues={selectedProject ? {
                title: selectedProject.title,
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
        </aside>
      </div>
    </div>
  );
}
