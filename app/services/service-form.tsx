import type { SupportService } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { storeService } from "./mutations";

export async function ServiceForm({ service }: { service?: SupportService }) {
  const [members, vendors, contracts] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.vendor.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.contract.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } })
  ]);
  const selects = [
    { label: "Responsable", name: "ownerId", options: members },
    { label: "Prestataire", name: "vendorId", options: vendors },
    { label: "Contrat", name: "contractId", options: contracts.map(({ id, title: name }) => ({ id, name })) },
    { label: "Criticité", name: "criticality", options: ["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((id, i) => ({ id, name: ["Faible", "Moyenne", "Haute", "Critique"][i] })) }
  ] as const;
  return <form action={storeService} className="grid gap-3 pt-3 md:grid-cols-2">
    {service && <input type="hidden" name="id" value={service.id} />}
    <label className="field-label">Nom<input name="title" className="field-input" required minLength={3} defaultValue={service?.title} /></label>
    <label className="field-label">Périmètre<input name="scope" className="field-input" defaultValue={service?.scope ?? ""} /></label>
    {selects.map(({ label, name, options }) => <label key={name} className="field-label">{label}
      <select name={name} className="field-select" defaultValue={service?.[name] ?? ""}>
        <option value="">Non renseigné</option>
        {options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>)}
    <label className="field-label">Contact d’escalade<input name="escalationContact" className="field-input" defaultValue={service?.escalationContact ?? ""} /></label>
    <label className="field-label">Procédure<textarea name="procedure" className="field-textarea" defaultValue={service?.procedure ?? ""} /></label>
    <label className="field-label">Notes<textarea name="notes" className="field-textarea" defaultValue={service?.notes ?? ""} /></label>
    <div className="self-end"><button className="button-primary">{service ? "Enregistrer" : "Créer le service"}</button></div>
  </form>;
}
