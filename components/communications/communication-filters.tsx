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
    <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-3">
      <input
        type="search"
        name="search"
        defaultValue={values.search ?? ""}
        placeholder="Recherche"
        className="rounded border border-slate-300 px-3 py-2"
      />
      <select name="status" defaultValue={values.status ?? ""} className="rounded border border-slate-300 px-3 py-2">
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
        className="rounded border border-slate-300 px-3 py-2"
      />
      <select name="projectId" defaultValue={values.projectId ?? ""} className="rounded border border-slate-300 px-3 py-2">
        <option value="">Tous les projets</option>
        {projectOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <select name="actionId" defaultValue={values.actionId ?? ""} className="rounded border border-slate-300 px-3 py-2">
        <option value="">Toutes les actions</option>
        {actionOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <select name="contractId" defaultValue={values.contractId ?? ""} className="rounded border border-slate-300 px-3 py-2">
        <option value="">Tous les contrats</option>
        {contractOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="flex gap-2 md:col-span-2 xl:col-span-3">
        <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
          Filtrer
        </button>
        <a href="/communications" className="rounded border border-slate-300 px-4 py-2 text-slate-700">
          Réinitialiser
        </a>
        <a href="/api/export/markdown" className="rounded border border-slate-300 px-4 py-2 text-slate-700">
          Export Markdown
        </a>
      </div>
    </form>
  );
}
