import Link from "next/link";
import { CmdbSelect } from "@/components/cmdb/item-form";
import { cmdbCriticalities, cmdbEnvironments, cmdbLabel, cmdbStatuses, cmdbTypes } from "@/lib/domain/cmdb";
import { configurationOptions, listConfigurationItems } from "@/lib/services/cmdb-service";
import { cmdbFiltersSchema } from "@/lib/validation/cmdb";

export default async function CmdbPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = cmdbFiltersSchema.parse(await searchParams);
  const [items, options] = await Promise.all([listConfigurationItems(filters), configurationOptions()]);
  const filtered = Object.values(filters).some(Boolean);

  return <div className="space-y-4">
    <header className="workbench-header">
      <div>
        <h1 className="text-2xl font-semibold">CMDB</h1>
        <p className="text-sm text-slate-600">Inventaire des éléments du SI et de leurs dépendances</p>
      </div>
      <Link href="/cmdb/nouveau" className="button-primary">Nouvel élément</Link>
    </header>

    <form method="get" action="/cmdb" className="workbench-panel space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="field-label sm:col-span-2">
          Rechercher dans l’inventaire
          <input name="q" type="search" className="field-input" defaultValue={filters.q} maxLength={120}
            placeholder="Nom, référence, responsable, service…" />
        </label>
        <CmdbSelect name="type" label="Type" options={cmdbTypes} value={filters.type} empty="Tous les types" />
        <CmdbSelect name="status" label="Statut" options={cmdbStatuses} value={filters.status} empty="Tous les statuts" />
        <CmdbSelect name="environment" label="Environnement" options={cmdbEnvironments} value={filters.environment} empty="Tous les environnements" />
        <CmdbSelect name="criticality" label="Criticité" options={cmdbCriticalities} value={filters.criticality} empty="Toutes les criticités" />
        <CmdbSelect name="serviceId" label="Service" value={filters.serviceId} empty="Tous les services"
          options={Object.fromEntries(options.services.map(({ id, title }) => [id, title]))} />
        <CmdbSelect name="vendorId" label="Prestataire" value={filters.vendorId} empty="Tous les prestataires"
          options={Object.fromEntries(options.vendors.map(({ id, name }) => [id, name]))} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="button-secondary">Filtrer</button>
        {filtered && <Link href="/cmdb" className="pilot-row-link text-sm">Réinitialiser les filtres</Link>}
      </div>
    </form>

    <section className="min-w-0 space-y-2" aria-labelledby="cmdb-results">
      <h2 id="cmdb-results" className="panel-title">{items.length} {items.length === 1 ? "élément" : "éléments"}</h2>
      {items.length ? <div className="workbench-table-shell">
        <table className="workbench-table">
          <thead><tr><th>Élément</th><th>Type</th><th>Environnement</th><th>Statut</th><th>Criticité</th><th>Service</th></tr></thead>
          <tbody>{items.map((item) => <tr key={item.id}>
            <td>
              <Link href={`/cmdb/${item.id}`} className="pilot-row-link">{item.name}</Link>
              {item.reference && <p className="break-all text-xs text-slate-600">{item.reference}</p>}
            </td>
            <td>{cmdbLabel(cmdbTypes, item.type)}</td>
            <td>{cmdbLabel(cmdbEnvironments, item.environment)}</td>
            <td>{cmdbLabel(cmdbStatuses, item.status)}</td>
            <td className={item.criticality === "CRITICAL" ? "font-semibold text-red-700" : undefined}>{cmdbLabel(cmdbCriticalities, item.criticality)}</td>
            <td>{item.service && <Link href={`/services/${item.service.id}`} className="pilot-row-link">{item.service.title}</Link>}</td>
          </tr>)}</tbody>
        </table>
      </div> : <div className="workbench-panel text-sm text-slate-600">
        {filtered ? "Aucun élément ne correspond aux filtres." : "L’inventaire est vide. Créez un premier élément pour commencer."}
      </div>}
    </section>
  </div>;
}
