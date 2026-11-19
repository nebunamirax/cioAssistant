import type { ConfigurationItem } from "@prisma/client";
import { saveConfigurationItem } from "@/app/cmdb/mutations";
import { cmdbCriticalities, cmdbEnvironments, cmdbStatuses, cmdbTypes } from "@/lib/domain/cmdb";
import type { configurationOptions } from "@/lib/services/cmdb-service";
import { CmdbActionForm } from "./action-form";

export function CmdbSelect({ name, label, options, value, empty, id = `cmdb-${name}` }: {
  name: string;
  label: string;
  options: Record<string, string>;
  value?: string | null;
  empty?: string;
  id?: string;
}) {
  return <div className="field-label">
    <label htmlFor={id}>{label}</label>
    <select id={id} className="field-select" name={name} defaultValue={value ?? ""} required={empty === undefined}>
      {empty !== undefined && <option value="">{empty}</option>}
      {Object.entries(options).map(([id, text]) => <option key={id} value={id}>{text}</option>)}
    </select>
  </div>;
}

export function CmdbItemForm({ item, options }: {
  item?: ConfigurationItem;
  options: Awaited<ReturnType<typeof configurationOptions>>;
}) {
  return <CmdbActionForm action={saveConfigurationItem.bind(null, item?.id ?? null)}>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="field-label">
        Nom
        <input name="name" className="field-input" defaultValue={item?.name} required maxLength={160} />
      </label>
      <label className="field-label">
        Référence
        <input name="reference" className="field-input" defaultValue={item?.reference ?? ""} maxLength={80} />
      </label>
      <CmdbSelect name="type" label="Type" options={cmdbTypes} value={item?.type ?? "APPLICATION"} />
      <CmdbSelect name="status" label="Statut" options={cmdbStatuses} value={item?.status ?? "ACTIVE"} />
      <CmdbSelect name="environment" label="Environnement" options={cmdbEnvironments} value={item?.environment ?? "PRODUCTION"} />
      <CmdbSelect name="criticality" label="Criticité" options={cmdbCriticalities} value={item?.criticality ?? "STANDARD"} />
      <label className="field-label sm:col-span-2">
        Responsable
        <input name="owner" className="field-input" defaultValue={item?.owner ?? ""} maxLength={160} />
      </label>
      <CmdbSelect name="serviceId" label="Service rattaché" value={item?.serviceId} empty="Aucun service"
        options={Object.fromEntries(options.services.map(({ id, title }) => [id, title]))} />
      <CmdbSelect name="vendorId" label="Prestataire rattaché" value={item?.vendorId} empty="Aucun prestataire"
        options={Object.fromEntries(options.vendors.map(({ id, name }) => [id, name]))} />
      <label className="field-label sm:col-span-2">
        Description
        <textarea name="description" className="field-textarea" defaultValue={item?.description ?? ""} maxLength={5000} />
      </label>
    </div>
    <button className="button-primary mt-4">{item ? "Enregistrer la fiche" : "Créer l’élément"}</button>
  </CmdbActionForm>;
}
