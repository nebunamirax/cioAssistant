"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
import { actionLabels, priorityLabels, projectLabels } from "@/lib/domain/display-labels";
import type { PmoApplied, PmoPreview } from "@/lib/services/pmo-intake-service";
import { pmoLineLimit, pmoTextLimit } from "@/lib/validation/pmo-intake";

const operationLabels = {
  project_updated: "Projet à mettre à jour",
  action_updated: "Action à mettre à jour",
  action_created: "Action à créer"
};

const fieldLabels = { status: "Statut", priority: "Priorité", targetDate: "Date cible", dueDate: "Échéance" };
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "Europe/Paris" });

function formatValue(field: keyof typeof fieldLabels, value: string | null, project: boolean) {
  if (value === null) return "—";
  if (field === "status") return (project ? projectLabels : actionLabels)[value] ?? value;
  if (field === "priority") return priorityLabels[value] ?? value;
  return dateFormat.format(new Date(value));
}

async function sendIntake<T>(payload: object): Promise<T> {
  const response = await fetch("/api/pmo/intake", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "La demande a échoué. Réessayez.");
  return result.data as T;
}

export function PmoIntakePanel({ projects, initialProject }: { projects: { id: string; title: string }[]; initialProject: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [projectId, setProjectId] = useState(initialProject);
  const [busy, setBusy] = useState<"preview" | "apply" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PmoPreview | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [applied, setApplied] = useState<PmoApplied | null>(null);
  const exampleProject = projects.find((project) => project.id === projectId) ?? projects[0];
  const example = exampleProject
    ? `Projet ${exampleProject.title} en cours\n- Préparer le support du COPIL pour ${exampleProject.title}`
    : "Projet Migration ERP en cours\n- Préparer le support du COPIL pour Migration ERP";

  function editInput() {
    setPreview(null);
    setSelected([]);
    setApplied(null);
    setError(null);
  }

  async function analyze() {
    setBusy("preview");
    editInput();
    try {
      const data = await sendIntake<PmoPreview>({ mode: "preview", text, sourceName, projectId: projectId || undefined });
      setPreview(data);
      setSelected(data.proposals.map((proposal) => proposal.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "L’analyse a échoué. Réessayez.");
    } finally {
      setBusy(null);
    }
  }

  async function apply(importId: string) {
    setBusy("apply");
    setError(null);
    try {
      const data = await sendIntake<PmoApplied>({ mode: "apply", importId, selected });
      setApplied(data);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "L’enregistrement a échoué. Réessayez.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="workspace-assistant-grid">
      <section className="pilot-panel min-w-0">
        <div className="workspace-panel-heading"><h2>Source à analyser</h2></div>
        <form className="workspace-intake-form" onSubmit={(event) => { event.preventDefault(); void analyze(); }}>
          <fieldset disabled={busy !== null} className="min-w-0 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                Nom de la source <span className="font-normal text-slate-500">(facultatif)</span>
                <input className="field-input mt-1.5" value={sourceName} maxLength={160} placeholder="Ex. COPIL de jeudi" onChange={(event) => { setSourceName(event.target.value); editInput(); }} />
              </label>
              <label className="min-w-0 text-sm font-semibold text-slate-700">
                Projet
                <select className="field-select mt-1.5" value={projectId} onChange={(event) => { setProjectId(event.target.value); editInput(); }}>
                  <option value="">Détecter dans le texte</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
                </select>
              </label>
            </div>
            <div>
              <label htmlFor="pmo-text" className="field-label">Compte rendu ou e-mail</label>
              <textarea
                id="pmo-text" className="field-textarea min-h-[205px]" value={text} required minLength={10} maxLength={pmoTextLimit} rows={9}
                aria-describedby="pmo-hint" placeholder="Collez ici le texte à transformer en actions et mises à jour."
                onChange={(event) => { setText(event.target.value); editInput(); }}
              />
              <p id="pmo-hint" className="field-hint">Une mise à jour par ligne. Indiquez le titre exact de la fiche et une date au format JJ/MM/AAAA si nécessaire. Maximum {pmoLineLimit} lignes.</p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              {!text && <button type="button" className="workspace-panel-link" onClick={() => setText(example)}>Insérer un exemple</button>}
              <button className="button-primary ml-auto gap-2" disabled={text.trim().length < 10 || busy !== null}>
                <WorkspaceIcon name="sparkles" className="h-4 w-4" />
                {busy === "preview" ? "Analyse en cours…" : preview ? "Relancer l’analyse" : "Analyser le texte"}
              </button>
            </div>
          </fieldset>
        </form>
      </section>

      <section className="pilot-panel min-w-0" aria-labelledby="pmo-preview-title">
        <div className="workspace-panel-heading">
          <h2 id="pmo-preview-title">{applied ? "Mises à jour appliquées" : "Aperçu des modifications"}</h2>
          {!applied && preview && preview.proposals.length > 0 && <span className="text-xs text-slate-600">{selected.length}/{preview.proposals.length} sélectionnées</span>}
        </div>
        {error && <p role="alert" className="mx-4 mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
        {applied ? (
          <>
            <p className="sr-only" role="status">{applied.items.length === 1 ? "Une modification appliquée." : `${applied.items.length} modifications appliquées.`}</p>
            <ul className="workspace-feed">
              {applied.items.map((item) => <li key={item.id}>
                <Link href={item.href} className="workspace-feed-row">
                  <span className="workspace-feed-icon" data-tone="green"><WorkspaceIcon name="check" className="h-4 w-4" /></span>
                  <span className="workspace-feed-text"><strong>{item.title}</strong><span>{item.type === "action_created" ? "Action créée" : "Fiche mise à jour"}</span></span>
                  <WorkspaceIcon name="right" className="h-4 w-4" />
                </Link>
              </li>)}
            </ul>
          </>
        ) : preview ? (
          <div className="min-w-0">
            {preview.proposals.length ? (
              <fieldset className="min-w-0 divide-y divide-slate-100" disabled={busy !== null}>
                <legend className="sr-only">Modifications à appliquer</legend>
                {preview.proposals.map((proposal) => (
                  <article key={proposal.id} className="workspace-proposal">
                    <label className="flex min-w-0 items-start gap-2.5">
                      <input
                        type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-indigo-600" checked={selected.includes(proposal.id)}
                        onChange={(event) => setSelected(event.target.checked ? [...selected, proposal.id] : selected.filter((id) => id !== proposal.id))}
                      />
                      <span className="min-w-0 break-words">
                        <span className="block text-xs font-semibold text-indigo-700">{operationLabels[proposal.type]}</span>
                        <strong className="block text-sm text-slate-900">{proposal.title}</strong>
                        {proposal.projectTitle && <span className="block text-xs text-slate-500">{proposal.projectTitle}</span>}
                      </span>
                    </label>
                    <dl className="mt-2 space-y-1 pl-6 text-xs">
                      {proposal.changes.map(({ field, before, after }) => (
                        <div key={field} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <dt className="font-medium text-slate-600">{fieldLabels[field]}</dt>
                          <dd className="flex min-w-0 flex-wrap items-center gap-1.5">
                            {proposal.type !== "action_created" && (
                              <><span className="text-slate-500">{formatValue(field, before, proposal.type === "project_updated")}</span><span aria-hidden="true">→</span><span className="sr-only">devient</span></>
                            )}
                            <span className="font-semibold text-slate-800">{formatValue(field, after, proposal.type === "project_updated")}</span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <details className="mt-2 pl-6 text-xs text-slate-600">
                      <summary className="cursor-pointer font-medium">Extrait source</summary>
                      <blockquote className="mt-1 break-words border-l-2 border-indigo-200 pl-2">{proposal.line}</blockquote>
                      {proposal.href && <Link className="workspace-panel-link mt-1" href={proposal.href}>Consulter la fiche <WorkspaceIcon name="arrow" className="h-3.5 w-3.5" /></Link>}
                    </details>
                  </article>
                ))}
              </fieldset>
            ) : <p className="workspace-empty" role="status">Aucune modification proposée. Vérifiez les titres des fiches dans le texte.</p>}
            {preview.clarifications.length > 0 && (
              <details className="workspace-clarifications" open={!preview.proposals.length}>
                <summary>{preview.clarifications.length} {preview.clarifications.length === 1 ? "ligne à vérifier" : "lignes à vérifier"}</summary>
                <ul className="mt-2 space-y-2">
                  {preview.clarifications.map((item) => <li key={item.id} className="break-words"><strong>{item.reason}</strong><p className="mt-0.5">{item.line}</p></li>)}
                </ul>
              </details>
            )}
            {preview.id && <div className="workspace-intake-footer">
              <button type="button" className="button-primary" disabled={busy !== null || !selected.length} onClick={() => { if (preview.id) void apply(preview.id); }}>
                {busy === "apply" ? "Application en cours…" : selected.length === 1 ? "Appliquer 1 modification" : `Appliquer ${selected.length} modifications`}
              </button>
            </div>}
          </div>
        ) : (
          <div className="workspace-preview-empty" role="status">
            <span className="workspace-feed-icon" data-tone="blue"><WorkspaceIcon name="list" /></span>
            <p>{busy === "preview" ? "Recherche des fiches et des changements…" : "L’analyse affichera ici les fiches concernées et les valeurs proposées. Vous pourrez choisir celles à appliquer."}</p>
          </div>
        )}
      </section>
    </div>
  );
}
