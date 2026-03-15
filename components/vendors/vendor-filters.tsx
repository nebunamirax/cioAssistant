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
        <a href="/vendors" className="button-secondary">
          Réinitialiser
        </a>
      </div>
    </form>
  );
}
