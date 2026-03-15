import { ACTION_STATUSES, PRIORITIES } from "@/lib/domain/constants";

type ActionFiltersProps = {
  values: {
    search?: string;
    status?: string;
    priority?: string;
    overdueOnly?: boolean;
  };
};

export function ActionFilters({ values }: ActionFiltersProps) {
  return (
    <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-4">
      <input
        type="search"
        name="search"
        defaultValue={values.search ?? ""}
        placeholder="Recherche"
        className="rounded border border-slate-300 px-3 py-2"
      />
      <select name="status" defaultValue={values.status ?? ""} className="rounded border border-slate-300 px-3 py-2">
        <option value="">Tous les statuts</option>
        {ACTION_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <select name="priority" defaultValue={values.priority ?? ""} className="rounded border border-slate-300 px-3 py-2">
        <option value="">Toutes les priorités</option>
        {PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {priority}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 rounded border border-slate-300 px-3 py-2 text-sm text-slate-700">
        <input type="checkbox" name="overdueOnly" value="true" defaultChecked={values.overdueOnly ?? false} />
        Retard uniquement
      </label>
      <div className="md:col-span-4 flex gap-2">
        <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
          Filtrer
        </button>
        <a href="/actions" className="rounded border border-slate-300 px-4 py-2 text-slate-700">
          Réinitialiser
        </a>
      </div>
    </form>
  );
}
