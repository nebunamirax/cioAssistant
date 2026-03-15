import { CONTRACT_STATUSES, RENEWAL_TYPES } from "@/lib/domain/constants";

type ContractFiltersProps = {
  values: {
    search?: string;
    status?: string;
    renewalType?: string;
    expiringOnly?: boolean;
  };
};

export function ContractFilters({ values }: ContractFiltersProps) {
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
        {CONTRACT_STATUSES.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <select name="renewalType" defaultValue={values.renewalType ?? ""} className="field-select">
        <option value="">Tous les renouvellements</option>
        {RENEWAL_TYPES.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
        <input type="checkbox" name="expiringOnly" value="true" defaultChecked={values.expiringOnly ?? false} />
        Échéance 90 jours
      </label>
      <div className="flex gap-2 md:col-span-4">
        <button type="submit" className="button-primary">
          Filtrer
        </button>
        <a href="/contracts" className="button-secondary">
          Réinitialiser
        </a>
      </div>
    </form>
  );
}
