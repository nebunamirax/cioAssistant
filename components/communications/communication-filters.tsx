import { COMMUNICATION_STATUSES } from "@/lib/domain/constants";

type Option = {
  id: string;
  label: string;
};

type CommunicationFiltersProps = {
  values: {
    search?: string;
    status?: string;
    type?: string;
    projectId?: string;
    actionId?: string;
    contractId?: string;
  };
  projectOptions: Option[];
  actionOptions: Option[];
  contractOptions: Option[];
};

export function CommunicationFilters({
  values,
  projectOptions,
  actionOptions,
  contractOptions
}: CommunicationFiltersProps) {
  return (
    <form className="workbench-toolbar">
      <input
        type="search"
        name="search"
        defaultValue={values.search ?? ""}
        placeholder="Recherche"
        className="field-input md:col-span-2"
      />
      <select name="status" defaultValue={values.status ?? ""} className="field-select">
        <option value="">Tous les statuts</option>
        {COMMUNICATION_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <input
        type="search"
        name="type"
        defaultValue={values.type ?? ""}
        placeholder="Type"
        className="field-input"
      />
      <select name="projectId" defaultValue={values.projectId ?? ""} className="field-select">
        <option value="">Tous les projets</option>
        {projectOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <select name="actionId" defaultValue={values.actionId ?? ""} className="field-select">
        <option value="">Toutes les actions</option>
        {actionOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <select name="contractId" defaultValue={values.contractId ?? ""} className="field-select">
        <option value="">Tous les contrats</option>
        {contractOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="flex gap-2 md:col-span-4">
        <button type="submit" className="button-primary">
          Filtrer
        </button>
        <a href="/communications" className="button-secondary">
          Réinitialiser
        </a>
        <a href="/api/export/markdown" className="button-secondary">
          Export Markdown
        </a>
      </div>
    </form>
  );
}
