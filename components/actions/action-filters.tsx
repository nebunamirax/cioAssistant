import { actionLabels, priorityLabels } from "@/lib/domain/display-labels";
import Link from "next/link";
import { ACTION_STATUSES, PRIORITIES } from "@/lib/domain/constants";

type ActionFiltersProps = {
  values: {
    search?: string;
    status?: string;
    priority?: string;
    projectId?: string;
    unassigned?: boolean;
    openOnly?: boolean;
    overdueOnly?: boolean;
  };
  view?: "list" | "kanban";
  projects: { id: string; title: string }[];
};

export function ActionFilters({ values, view = "list", projects }: ActionFiltersProps) {
  const hasFilters = values.search || values.status || values.priority || values.overdueOnly || values.projectId || values.unassigned || values.openOnly;
  return (
    <form action="/actions" className="workspace-list-filters">
      <input type="hidden" name="view" value={view} />
      {values.openOnly && <label className="flex min-h-10 items-center gap-2 whitespace-nowrap px-1.5 text-sm text-slate-700">
        <input type="checkbox" name="openOnly" value="true" defaultChecked />
        Actions ouvertes
      </label>}
      <input
        type="search"
        name="search"
        defaultValue={values.search ?? ""}
        aria-label="Rechercher"
        placeholder="Rechercher…"
        className="field-input workspace-list-search"
      />
      <select aria-label="Statut" name="status" defaultValue={values.status ?? ""} className="field-select">
        <option value="">Tous les statuts</option>
        {ACTION_STATUSES.map((status) => (
          <option key={status} value={status}>
            {actionLabels[status]}
          </option>
        ))}
      </select>
      <select aria-label="Projet" name="projectId" defaultValue={values.unassigned ? "__unassigned" : values.projectId ?? ""} className="field-select">
        <option value="">Tous les projets</option>
        <option value="__unassigned">Sans projet</option>
        {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
      </select>
      <select aria-label="Priorité" name="priority" defaultValue={values.priority ?? ""} className="field-select">
        <option value="">Toutes les priorités</option>
        {PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {priorityLabels[priority]}
          </option>
        ))}
      </select>
      <label className="flex min-h-10 items-center gap-2 whitespace-nowrap px-1.5 text-sm text-slate-700">
        <input type="checkbox" name="overdueOnly" value="true" defaultChecked={values.overdueOnly ?? false} />
        Retard uniquement
      </label>
      <button type="submit" className="button-secondary">Filtrer</button>
      {hasFilters && <Link href={view === "kanban" ? "/actions?view=kanban" : "/actions"} className="workspace-panel-link">Réinitialiser</Link>}
    </form>
  );
}
