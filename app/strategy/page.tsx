import Link from "next/link";
import type { StrategicObjective } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getPortfolio, pilotageDate, projectLabels } from "@/lib/services/pilotage-service";
import { saveObjective, setProjectObjective } from "./mutations";

export const dynamic = "force-dynamic";

function ObjectiveForm({ objective }: { objective?: StrategicObjective }) {
  return (
    <form action={saveObjective} className="grid gap-3">
      {objective && <input type="hidden" name="id" value={objective.id} />}
      <label><span className="field-label">Objectif</span><input name="title" className="field-input" defaultValue={objective?.title} required minLength={3} maxLength={160} /></label>
      <label><span className="field-label">Résultat attendu</span><textarea name="description" className="field-textarea" defaultValue={objective?.description ?? ""} maxLength={2000} /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label><span className="field-label">Responsable</span><input name="ownerName" className="field-input" defaultValue={objective?.ownerName ?? ""} maxLength={120} /></label>
        <label><span className="field-label">Échéance</span><input type="date" name="targetDate" className="field-input" defaultValue={objective?.targetDate?.toISOString().slice(0, 10)} /></label>
      </div>
      <button className="button-primary justify-self-start">{objective ? "Enregistrer l’objectif" : "Créer l’objectif"}</button>
    </form>
  );
}

export default async function StrategyPage({ searchParams: searchParamsPromise }: { searchParams?: Promise<{ error?: string }> }) {
  const searchParams = await searchParamsPromise;
  const [objectives, portfolio] = await Promise.all([
    prisma.strategicObjective.findMany({ orderBy: { createdAt: "desc" } }),
    getPortfolio()
  ]);

  return (
    <div className="space-y-5">
      <header className="workbench-header">
        <div><h1 className="text-2xl font-semibold">Stratégie DSI</h1></div>
        <Link href="/roadmap" className="button-secondary">Voir la roadmap</Link>
      </header>
      {searchParams?.error && <p role="alert" className="workbench-panel text-sm text-rose-700">Vérifie les champs puis réessaie.</p>}
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <div className="space-y-4">
          {objectives.map((objective) => {
            const projects = portfolio.filter((project) => project.objective?.id === objective.id);
            const tracked = projects.filter((project) => project.status !== "CANCELLED");
            const done = tracked.filter((project) => project.status === "COMPLETED").length;
            return (
              <section key={objective.id} id={objective.id} className="workbench-panel space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><h2 className="text-lg font-semibold">{objective.title}</h2><p className="text-sm text-slate-600">{objective.ownerName ?? "Responsable à définir"} · {pilotageDate(objective.targetDate)}</p></div>
                  <span className="pilot-status" data-status="ACTIVE">{done}/{tracked.length} projets terminés</span>
                </div>
                {objective.description && <p className="whitespace-pre-wrap text-sm text-slate-700">{objective.description}</p>}
                <ul className="divide-y divide-slate-100">
                  {projects.map((project) => (
                    <li key={project.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <Link className="pilot-row-link" href={`/projects/${project.id}`}>{project.title}</Link>
                      <div className="flex items-center gap-2">
                        <span className="pilot-status" data-status={project.status}>{projectLabels[project.status] ?? project.status}</span>
                        <form action={setProjectObjective}>
                          <input type="hidden" name="projectId" value={project.id} /><input type="hidden" name="objectiveId" value="" />
                          <button className="text-xs text-slate-600 underline" aria-label={`Retirer ${project.title} de cet objectif`}>Retirer</button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
                {!projects.length && <p className="text-sm text-slate-600">Aucun projet rattaché.</p>}
                <details className="border-t border-slate-100 pt-3">
                  <summary className="cursor-pointer text-sm font-medium text-violet-800">Modifier l’objectif</summary>
                  <div className="mt-3"><ObjectiveForm objective={objective} /></div>
                </details>
              </section>
            );
          })}
          {!objectives.length && <p className="workbench-panel text-sm text-slate-600">Crée un objectif pour commencer à structurer le portefeuille.</p>}
        </div>
        <div className="space-y-4">
          <section className="workbench-panel space-y-3"><h2 className="panel-title">Nouvel objectif</h2><ObjectiveForm /></section>
          {objectives.length > 0 && portfolio.length > 0 && (
            <section className="workbench-panel space-y-3">
              <h2 className="panel-title">Rattacher un projet</h2>
              <form action={setProjectObjective} className="grid gap-3">
                <label><span className="field-label">Projet</span><select className="field-select" name="projectId" required defaultValue=""><option value="" disabled>Choisir un projet</option>{portfolio.map((project) => <option key={project.id} value={project.id}>{project.title}{project.objective ? ` · ${project.objective.title}` : ""}</option>)}</select></label>
                <label><span className="field-label">Objectif</span><select className="field-select" name="objectiveId" required defaultValue=""><option value="" disabled>Choisir un objectif</option>{objectives.map((objective) => <option key={objective.id} value={objective.id}>{objective.title}</option>)}</select></label>
                <button className="button-primary justify-self-start">Rattacher</button>
              </form>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
