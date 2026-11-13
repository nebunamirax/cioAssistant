"use client";

import Link from "next/link";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { externalStatuses, externalStatusLabels, type ExternalStatus } from "@/lib/domain/external-tracking";
import type { TicketMapping } from "@/lib/services/ticket-csv";
import { integrationRequest, type IntegrationProject } from "./integration-request";

const fields = [
  ["id", "Identifiant du ticket"], ["title", "Titre"], ["status", "Statut"], ["priority", "Priorité"],
  ["major", "Classement majeur"], ["assignees", "Responsable"], ["dueDate", "Échéance"], ["url", "Lien"]
] as const;
const endpoint = "/api/integrations/tickets";

type FilePreview = { headers: string[]; count: number };
type ImportPreview = {
  count: number;
  errors: { line: number; message: string }[];
  statuses: string[];
  mappings: { original: string; status: ExternalStatus }[];
  sample: { externalId: string; title: string; originalStatus: string | null; assignees: string }[];
};

export function TicketCsvImport({ projects, services, initialProjectId, initialServiceId }: { projects: IntegrationProject[]; services: IntegrationProject[]; initialProjectId: string; initialServiceId?: string }) {
  const [projectId, setProjectId] = useState(initialServiceId ? `service:${initialServiceId}` : initialProjectId);
  const [sourceName, setSourceName] = useState("Ticketing");
  const [csv, setCsv] = useState("");
  const [filePreview, setFilePreview] = useState<FilePreview>();
  const [mapping, setMapping] = useState<Partial<TicketMapping>>({});
  const [statusMap, setStatusMap] = useState<Record<string, ExternalStatus>>({});
  const [preview, setPreview] = useState<ImportPreview>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ count: number; project: string }>();

  async function loadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setCsv("");
    setFilePreview(undefined);
    setMapping({});
    setPreview(undefined);
    setStatusMap({});
    setSuccess(undefined);
    setError("");
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setError("Le CSV dépasse 1 Mio.");
      return;
    }
    setPending(true);
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
      const result = await integrationRequest<FilePreview>(endpoint, { mode: "inspect", csv: text });
      setCsv(text);
      setFilePreview(result);
    } catch (error) {
      setError(error instanceof TypeError ? "Enregistre le fichier en CSV UTF-8 puis réessaie." : (error as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function submit(mode: "preview" | "import") {
    setPending(true);
    setError("");
    setSuccess(undefined);
    try {
      const statuses = Object.entries(statusMap).map(([original, status]) => ({ original, status }));
      const target = projectId.startsWith("service:") ? { serviceId: projectId.slice(8) } : { projectId };
      const body = { mode, csv, mapping, statuses, ...target, sourceName };
      if (mode === "preview") {
        const result = await integrationRequest<ImportPreview>(endpoint, body);
        setPreview(result);
        setStatusMap(Object.fromEntries(result.mappings.map(({ original, status }) => [original, status])));
      } else {
        const result = await integrationRequest<{ count: number }>(endpoint, body);
        setSuccess({ count: result.count, project: projectId });
        setPreview(undefined);
      }
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setPending(false);
    }
  }

  function previewImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit("preview");
  }

  return (
    <section className="workbench-panel space-y-4">
      <div><h2 className="panel-title">Ticketing CSV</h2><p className="panel-caption">Charge un export CSV UTF-8. Pour actualiser les tickets, réutilise le même projet ou service et le même nom de source.</p></div>
      <form onSubmit={previewImport} className="space-y-4">
        <fieldset className="space-y-4" disabled={pending}>
          <div className="grid gap-3 md:grid-cols-3">
            <label><span className="field-label">Cible</span><select className="field-select" required value={projectId} onChange={(event) => { setProjectId(event.target.value); setPreview(undefined); setStatusMap({}); }}>
              <option value="">Choisir une cible</option>
              <optgroup label="Projets">{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</optgroup>
              <optgroup label="Services">{services.map((service) => <option key={service.id} value={`service:${service.id}`}>{service.title}</option>)}</optgroup>
            </select></label>
            <label><span className="field-label">Nom de la source</span><input className="field-input" required maxLength={100} value={sourceName} onChange={(event) => { setSourceName(event.target.value); setPreview(undefined); setStatusMap({}); }} /></label>
            <label><span className="field-label">Fichier CSV</span><input className="field-input" type="file" accept=".csv,text/csv" onChange={loadFile} /></label>
          </div>
          {filePreview && (
            <>
              <p className="text-sm text-slate-600">{filePreview.count} ligne(s) à examiner.</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {fields.map(([key, label]) => {
                  const required = key === "id" || key === "title";
                  return (
                    <label key={key}><span className="field-label">{label}{required ? " *" : ""}</span><select className="field-select" required={required} value={mapping[key] ?? ""} onChange={(event) => {
                      setMapping({ ...mapping, [key]: event.target.value === "" ? undefined : Number(event.target.value) });
                      setPreview(undefined);
                      if (key === "status") setStatusMap({});
                    }}>
                      <option value="">Aucune colonne</option>
                      {filePreview.headers.map((header, index) => <option key={index} value={index}>{index + 1}. {header || "Sans en-tête"}</option>)}
                    </select></label>
                  );
                })}
              </div>
              <button className="button-secondary">Vérifier les lignes</button>
            </>
          )}
        </fieldset>
      </form>
      {preview && (
        <div className="space-y-3 border-t border-slate-200 pt-3">
          <h3 className="panel-title">Aperçu avant import</h3>
          <p className="text-sm">{preview.count} ticket(s) valide(s) · {preview.errors.length} ligne(s) à corriger</p>
          {!!preview.errors.length && (
            <ul className="max-h-48 overflow-auto text-sm text-rose-700" aria-label="Erreurs du CSV">
              {preview.errors.map(({ line, message }) => <li key={line}>Ligne {line} · {message}</li>)}
            </ul>
          )}
          <ul className="divide-y divide-slate-100 text-sm">
            {preview.sample.map((item) => <li key={item.externalId} className="py-1"><strong>{item.externalId}</strong> · {item.title}{item.originalStatus ? ` · ${item.originalStatus}` : ""}{item.assignees ? ` · ${item.assignees}` : ""}</li>)}
          </ul>
          {!!preview.statuses.length && (
            <fieldset className="grid gap-2 sm:grid-cols-2" disabled={pending}>
              <legend className="mb-2 text-sm font-semibold">Associer les statuts du ticketing</legend>
              {preview.statuses.map((original) => (
                <label key={original}><span className="field-label break-words">{original}</span><select className="field-select" value={Object.hasOwn(statusMap, original) ? statusMap[original] : "UNKNOWN"} onChange={(event) => setStatusMap({ ...statusMap, [original]: event.target.value as ExternalStatus })}>
                  {externalStatuses.map((status) => <option key={status} value={status}>{externalStatusLabels[status]}</option>)}
                </select></label>
              ))}
            </fieldset>
          )}
          <button type="button" className="button-primary" disabled={pending || preview.errors.length > 0 || preview.count === 0} onClick={() => submit("import")}>Confirmer l’import</button>
        </div>
      )}
      {pending && <p role="status" className="text-sm text-slate-600">Traitement du fichier…</p>}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {success && <p role="status" className="text-sm text-emerald-800">{success.count} ticket(s) importé(s). <Link className="pilot-row-link" href={success.project.startsWith("service:") ? `/services/${success.project.slice(8)}` : `/projects/${success.project}#external-tracking`}>Ouvrir le suivi</Link></p>}
    </section>
  );
}
