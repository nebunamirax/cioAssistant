import Link from "next/link";
type VendorFiltersProps = {
  values: {
    search?: string;
    category?: string;
  };
};

export function VendorFilters({ values }: VendorFiltersProps) {
  return (
    <form className="workbench-toolbar-compact">
      <input
        type="search"
        name="search"
        defaultValue={values.search ?? ""}
        placeholder="Recherche"
        className="field-input"
      />
      <input
        name="category"
        defaultValue={values.category ?? ""}
        placeholder="Catégorie"
        className="field-input"
      />
      <div className="flex gap-2">
        <button type="submit" className="button-primary">
          Filtrer
        </button>
        <Link href="/vendors" className="button-secondary">
          Réinitialiser
        </Link>
      </div>
    </form>
  );
}
