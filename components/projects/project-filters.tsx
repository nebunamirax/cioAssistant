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
    <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-4">
      <input
        type="search"
        name="search"
        defaultValue={values.search ?? ""}
        placeholder="Recherche"
        className="rounded border border-slate-300 px-3 py-2"
      />
      <select name="type" defaultValue={values.type ?? ""} className="rounded border border-slate-300 px-3 py-2">
        <option value="">Tous les types</option>
        {PROJECT_TYPES.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <select name="status" defaultValue={values.status ?? ""} className="rounded border border-slate-300 px-3 py-2">
        <option value="">Tous les statuts</option>
        {PROJECT_STATUSES.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <select name="priority" defaultValue={values.priority ?? ""} className="rounded border border-slate-300 px-3 py-2">
        <option value="">Toutes les priorités</option>
        {PRIORITIES.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <div className="md:col-span-4 flex gap-2">
        <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
          Filtrer
        </button>
        <a href="/projects" className="rounded border border-slate-300 px-4 py-2 text-slate-700">
          Réinitialiser
        </a>
      </div>
    </form>
  );
}
