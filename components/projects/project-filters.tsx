import { projectTypeLabels, projectLabels, priorityLabels } from "@/lib/domain/display-labels";
import Link from "next/link";
import { PRIORITIES, PROJECT_STATUSES, PROJECT_TYPES } from "@/lib/domain/constants";

type ProjectFiltersProps = {
  values: {
    search?: string;
    type?: string;
    status?: string;
    priority?: string;
  };
};

export function ProjectFilters({ values }: ProjectFiltersProps) {
  return (
    <form action="/projects" className="workspace-list-filters">
      <input
        type="search"
        name="search"
        defaultValue={values.search ?? ""}
        aria-label="Rechercher"
        placeholder="Rechercher…"
        className="field-input workspace-list-search"
      />
      <select aria-label="Type" name="type" defaultValue={values.type ?? ""} className="field-select">
        <option value="">Tous les types</option>
        {PROJECT_TYPES.map((item) => (
          <option key={item} value={item}>{projectTypeLabels[item]}</option>
        ))}
      </select>
      <select aria-label="Statut" name="status" defaultValue={values.status ?? ""} className="field-select">
        <option value="">Tous les statuts</option>
        {PROJECT_STATUSES.map((item) => (
          <option key={item} value={item}>{projectLabels[item]}</option>
        ))}
      </select>
      <select aria-label="Priorité" name="priority" defaultValue={values.priority ?? ""} className="field-select">
        <option value="">Toutes les priorités</option>
        {PRIORITIES.map((item) => (
          <option key={item} value={item}>{priorityLabels[item]}</option>
        ))}
      </select>
      <button type="submit" className="button-secondary">Filtrer</button>
      {(values.search || values.type || values.status || values.priority) && <Link href="/projects" className="workspace-panel-link">Réinitialiser</Link>}
    </form>
  );
}
