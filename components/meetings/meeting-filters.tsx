type ProjectOption = {
  id: string;
  title: string;
};

type MeetingFiltersProps = {
  values: {
    search?: string;
    projectId?: string;
  };
  projectOptions: ProjectOption[];
};

export function MeetingFilters({ values, projectOptions }: MeetingFiltersProps) {
  return (
    <form className="workbench-toolbar">
      <input
        type="search"
        name="search"
        defaultValue={values.search ?? ""}
        placeholder="Recherche"
        className="field-input md:col-span-3"
      />
      <select name="projectId" defaultValue={values.projectId ?? ""} className="field-select">
        <option value="">Tous les projets</option>
        {projectOptions.map((project) => (
          <option key={project.id} value={project.id}>
            {project.title}
          </option>
        ))}
      </select>
      <div className="flex gap-2 md:col-span-2">
        <button type="submit" className="button-primary">
          Filtrer
        </button>
        <a href="/meetings" className="button-secondary">
          Reinitialiser
        </a>
      </div>
    </form>
  );
}
