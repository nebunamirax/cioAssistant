import Link from "next/link";
import { notFound } from "next/navigation";
import { CmdbActionForm } from "@/components/cmdb/action-form";
import { CmdbItemForm, CmdbSelect } from "@/components/cmdb/item-form";
import { cmdbCriticalities, cmdbEnvironments, cmdbLabel, cmdbRelationTypes, cmdbStatuses, cmdbTypes } from "@/lib/domain/cmdb";
import { configurationOptions, configurationTargets, getConfigurationItem } from "@/lib/services/cmdb-service";
import { addConfigurationRelation, deleteConfigurationItem, removeConfigurationRelation } from "../mutations";

export default async function ConfigurationItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getConfigurationItem(id);
  if (!item) notFound();

  const [options, targets] = await Promise.all([configurationOptions(), configurationTargets(id)]);
  const relationGroups = [
    {
      title: "Relations sortantes",
      empty: "Cet élément ne référence aucun autre élément.",
      relations: item.outgoing.map(({ id, type, target }) => ({ id, type, source: item, target, other: target }))
    },
    {
      title: "Relations entrantes",
      empty: "Aucun autre élément ne référence cette fiche.",
      relations: item.incoming.map(({ id, type, source }) => ({ id, type, source, target: item, other: source }))
    }
  ];

  return <div className="space-y-4">
    <header className="workbench-header">
      <div className="min-w-0">
        <Link href="/cmdb" className="pilot-row-link">Retour à la CMDB</Link>
        <h1 className="break-words text-2xl font-semibold">{item.name}</h1>
        <p className="break-words text-sm text-slate-600">
          {[item.reference, cmdbLabel(cmdbTypes, item.type), cmdbLabel(cmdbEnvironments, item.environment), cmdbLabel(cmdbStatuses, item.status)]
            .filter(Boolean).join(" · ")}
        </p>
      </div>
    </header>

    <div className="grid min-w-0 gap-4 xl:grid-cols-2">
      <div className="min-w-0 space-y-4">
        <section className="workbench-panel space-y-3">
          <h2 className="panel-title">Fiche de configuration</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="font-semibold">Criticité</dt><dd>{cmdbLabel(cmdbCriticalities, item.criticality)}</dd></div>
            <div><dt className="font-semibold">Responsable</dt><dd className="break-words">{item.owner ?? "—"}</dd></div>
            <div><dt className="font-semibold">Service</dt><dd>{item.service
              ? <Link className="pilot-row-link break-words" href={`/services/${item.service.id}`}>{item.service.title}</Link>
              : "—"}</dd></div>
            <div><dt className="font-semibold">Prestataire</dt><dd>{item.vendor
              ? <Link className="pilot-row-link break-words" href={`/vendors/${item.vendor.id}`}>{item.vendor.name}</Link>
              : "—"}</dd></div>
            {item.description && <div className="sm:col-span-2"><dt className="font-semibold">Description</dt>
              <dd className="whitespace-pre-wrap break-words">{item.description}</dd></div>}
          </dl>
        </section>
        <details className="workbench-panel">
          <summary className="cursor-pointer font-semibold">Modifier la fiche</summary>
          <div className="mt-4"><CmdbItemForm item={item} options={options} /></div>
        </details>
      </div>

      <section className="workbench-panel min-w-0 space-y-4" aria-labelledby="cmdb-relations">
        <h2 id="cmdb-relations" className="panel-title">Relations et dépendances</h2>
        {relationGroups.map(({ title, empty, relations }) => <div key={title} className="space-y-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          {relations.length ? <ul className="divide-y divide-slate-200">
            {relations.map(({ id: relationId, type, source, target, other }) => <li key={relationId} className="flex flex-wrap items-start justify-between gap-2 py-2 text-sm">
              <div className="min-w-0">
                <p className="break-words">
                  {source.id === id ? source.name : <Link className="pilot-row-link" href={`/cmdb/${source.id}`}>{source.name}</Link>}
                  {" "}{cmdbLabel(cmdbRelationTypes, type)}{" "}
                  {target.id === id ? target.name : <Link className="pilot-row-link" href={`/cmdb/${target.id}`}>{target.name}</Link>}
                </p>
                <p className="break-words text-xs text-slate-600">
                  {[other.reference, cmdbLabel(cmdbTypes, other.type), cmdbLabel(cmdbStatuses, other.status)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <CmdbActionForm action={removeConfigurationRelation.bind(null, id, relationId)}
                confirmation="Retirer cette relation de la CMDB ?">
                <button className="button-secondary" aria-label={`Retirer la relation entre ${source.name} et ${target.name}`}>Retirer</button>
              </CmdbActionForm>
            </li>)}
          </ul> : <p className="text-sm text-slate-600">{empty}</p>}
        </div>)}
        {targets.length ? <CmdbActionForm action={addConfigurationRelation.bind(null, id)} className="border-t border-slate-200 pt-3">
          <div className="grid gap-3">
            <CmdbSelect id="cmdb-relation-type" name="type" label="Type de relation" options={cmdbRelationTypes} value="DEPENDS_ON" />
            <div className="field-label">
              <label htmlFor="cmdb-target">Élément cible</label>
              <select id="cmdb-target" name="targetId" className="field-select" required defaultValue="">
                <option value="" disabled>Sélectionner un élément</option>
                {targets.map((target) => <option key={target.id} value={target.id}>
                  {[target.name, target.reference, cmdbLabel(cmdbTypes, target.type)].filter(Boolean).join(" · ")}
                </option>)}
              </select>
            </div>
          </div>
          <button className="button-secondary mt-3">Ajouter la relation</button>
        </CmdbActionForm> : <p className="text-sm text-slate-600">Créez un autre élément pour pouvoir établir une relation.</p>}
      </section>
    </div>
    <details className="workbench-panel max-w-2xl">
      <summary className="cursor-pointer text-sm font-semibold text-red-700">Supprimer l’élément</summary>
      <p className="mb-3 mt-2 text-sm text-slate-600">La suppression retire définitivement la fiche et ses relations.</p>
      <CmdbActionForm action={deleteConfigurationItem.bind(null, id)} confirmation="Supprimer définitivement cette fiche et ses relations ?">
        <button className="button-secondary text-red-700">Supprimer définitivement</button>
      </CmdbActionForm>
    </details>
  </div>;
}
