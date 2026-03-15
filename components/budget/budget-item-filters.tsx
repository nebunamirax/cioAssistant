type BudgetItemFiltersProps = {
  values: {
    search?: string;
    category?: string;
    fiscalYear?: string;
  };
};

export function BudgetItemFilters({ values }: BudgetItemFiltersProps) {
  return (
    <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-4">
      <input
        type="search"
        name="search"
        defaultValue={values.search ?? ""}
        placeholder="Recherche"
        className="rounded border border-slate-300 px-3 py-2"
      />
      <input
        name="category"
        defaultValue={values.category ?? ""}
        placeholder="Catégorie"
        className="rounded border border-slate-300 px-3 py-2"
      />
      <input
        name="fiscalYear"
        defaultValue={values.fiscalYear ?? ""}
        placeholder="Exercice"
        className="rounded border border-slate-300 px-3 py-2"
      />
      <div className="flex gap-2">
        <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
          Filtrer
        </button>
        <a href="/budget" className="rounded border border-slate-300 px-4 py-2 text-slate-700">
          Réinitialiser
        </a>
      </div>
    </form>
  );
}
