import Link from "next/link";
type BudgetItemFiltersProps = {
  values: {
    search?: string;
    category?: string;
    fiscalYear?: string;
  };
};

export function BudgetItemFilters({ values }: BudgetItemFiltersProps) {
  return (
    <form className="workbench-toolbar">
      <input
        type="search"
        name="search"
        defaultValue={values.search ?? ""}
        placeholder="Recherche"
        className="field-input md:col-span-2"
      />
      <input
        name="category"
        defaultValue={values.category ?? ""}
        placeholder="Catégorie"
        className="field-input"
      />
      <input
        name="fiscalYear"
        defaultValue={values.fiscalYear ?? ""}
        placeholder="Exercice"
        className="field-input"
      />
      <div className="flex gap-2 md:col-span-4">
        <button type="submit" className="button-primary">
          Filtrer
        </button>
        <Link href="/budget" className="button-secondary">
          Réinitialiser
        </Link>
      </div>
    </form>
  );
}
