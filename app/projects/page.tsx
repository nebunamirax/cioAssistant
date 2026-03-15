import Link from "next/link";
import { ProjectFilters } from "@/components/projects/project-filters";
import { ProjectForm } from "@/components/projects/project-form";
import { PRIORITIES, PROJECT_STATUSES, PROJECT_TYPES } from "@/lib/domain/constants";
import { listProjects } from "@/lib/services/project-service";
import type { ProjectFilters as ProjectFiltersInput } from "@/lib/validation/project";

type ProjectsPageProps = {
  searchParams?: {
    search?: string;
    type?: string;
    status?: string;
    priority?: string;
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
  const projects = await listProjects(filters);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Projets</h1>
      <ProjectFilters values={filters} />
      <ProjectForm />
      <div className="rounded-lg border border-slate-200 bg-white">
        <table className="w-full table-auto text-sm">
          <thead className="bg-slate-100 text-left text-slate-700">
            <tr>
              <th className="p-3">Titre</th>
              <th className="p-3">Type</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Priorité</th>
              <th className="p-3">Cible</th>
              <th className="p-3">Actions</th>
              <th className="p-3">Modifier</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="border-t border-slate-100">
                <td className="p-3">
                  <Link href={`/projects/${project.id}`} className="font-medium text-slate-900 hover:underline">
                    {project.title}
                  </Link>
                </td>
                <td className="p-3">{project.type}</td>
                <td className="p-3">{project.status}</td>
                <td className="p-3">{project.priority}</td>
                <td className="p-3">{project.targetDate ? new Intl.DateTimeFormat("fr-FR").format(project.targetDate) : "—"}</td>
                <td className="p-3">{project._count.actions}</td>
                <td className="p-3">
                  <Link href={`/projects/${project.id}`} className="text-slate-900 hover:underline">
                    Modifier
                  </Link>
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={7} className="p-3 text-slate-500">
                  Aucun projet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
