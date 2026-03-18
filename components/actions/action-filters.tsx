import { ACTION_STATUSES, PRIORITIES } from "@/lib/domain/constants";

type ActionFiltersProps = {
  values: {
    search?: string;
    status?: string;
    priority?: string;
    overdueOnly?: boolean;
  };
  view?: "list" | "kanban";
};

export function ActionFilters({ values, view = "list" }: ActionFiltersProps) {
  return (
    <form className="workbench-toolbar">
      <input type="hidden" name="view" value={view} />
      <input
        type="search"
        name="search"
        defaultValue={values.search ?? ""}
        placeholder="Recherche"
        className="field-input md:col-span-2"
      />
      <select name="status" defaultValue={values.status ?? ""} className="field-select">
        <option value="">Tous les statuts</option>
        {ACTION_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <select name="priority" defaultValue={values.priority ?? ""} className="field-select">
        <option value="">Toutes les priorités</option>
        {PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {priority}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
        <input type="checkbox" name="overdueOnly" value="true" defaultChecked={values.overdueOnly ?? false} />
        Retard uniquement
      </label>
      <div className="flex gap-2 md:col-span-4">
        <button type="submit" className="button-primary">
          Filtrer
        </button>
        <a href="/actions" className="button-secondary">
          Réinitialiser
        </a>
      </div>
    </form>
  );
}
