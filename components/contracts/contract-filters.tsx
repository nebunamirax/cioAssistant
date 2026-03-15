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
        {CONTRACT_STATUSES.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <select name="renewalType" defaultValue={values.renewalType ?? ""} className="rounded border border-slate-300 px-3 py-2">
        <option value="">Tous les renouvellements</option>
        {RENEWAL_TYPES.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <label className="flex items-center gap-2 rounded border border-slate-300 px-3 py-2 text-sm text-slate-700">
        <input type="checkbox" name="expiringOnly" value="true" defaultChecked={values.expiringOnly ?? false} />
        Échéance 90 jours
      </label>
      <div className="md:col-span-4 flex gap-2">
        <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
          Filtrer
        </button>
        <a href="/contracts" className="rounded border border-slate-300 px-4 py-2 text-slate-700">
          Réinitialiser
        </a>
      </div>
    </form>
  );
}
