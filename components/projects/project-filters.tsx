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
    <form className="workbench-toolbar">
      <input
        type="search"
        name="search"
        defaultValue={values.search ?? ""}
        placeholder="Recherche"
        className="field-input md:col-span-2"
      />
      <select name="type" defaultValue={values.type ?? ""} className="field-select">
        <option value="">Tous les types</option>
        {PROJECT_TYPES.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <select name="status" defaultValue={values.status ?? ""} className="field-select">
        <option value="">Tous les statuts</option>
        {PROJECT_STATUSES.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <select name="priority" defaultValue={values.priority ?? ""} className="field-select">
        <option value="">Toutes les priorités</option>
        {PRIORITIES.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <div className="flex gap-2 md:col-span-4">
        <button type="submit" className="button-primary">
          Filtrer
        </button>
        <a href="/projects" className="button-secondary">
          Réinitialiser
        </a>
      </div>
    </form>
  );
}
