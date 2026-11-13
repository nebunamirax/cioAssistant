"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { integrationRequest, type IntegrationProject } from "./integration-request";

type Plan = { id: string; title: string };
type LinkedPlan = { key: string; title: string; projectId: string; lastSyncedAt: string | null };
const endpoint = "/api/integrations/planner";

export function PlannerControls({ connected, configured, callbackUrl, projects, linked, initialProjectId }: {
  connected: boolean;
  configured: boolean;
  callbackUrl: string;
  projects: IntegrationProject[];
  linked: LinkedPlan[];
  initialProjectId: string;
}) {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [planId, setPlanId] = useState("");
  const [projectId, setProjectId] = useState(initialProjectId);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; error?: boolean }>();

  async function loadPlans() {
    setPending(true);
    setFeedback(undefined);
    try {
      setPlans(await integrationRequest<Plan[]>(endpoint));
    } catch (error) {
      setFeedback({ message: (error as Error).message, error: true });
    } finally {
      setPending(false);
    }
  }

  async function sync(id: string, project: string) {
    setPending(true);
    setFeedback(undefined);
    try {
      const result = await integrationRequest<{ count: number }>(endpoint, { planId: id, projectId: project });
      setFeedback({ message: `${result.count} tâche(s) synchronisée(s).` });
      router.refresh();
    } catch (error) {
      setFeedback({ message: (error as Error).message, error: true });
    } finally {
      setPending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sync(planId, projectId);
  }

  return (
    <section className="workbench-panel space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="panel-title">Microsoft Planner</h2>
          <p className="panel-caption">{connected ? "Compte connecté · plans standard en lecture seule" : "Connecte ton compte professionnel pour choisir les plans standard."}</p>
        </div>
        {configured ? (
          <a className="button-secondary" href={`${endpoint}/start`}>{connected ? "Reconnecter Planner" : "Connecter Planner"}</a>
        ) : <Link href="/settings#outlook-settings" className="button-secondary">Configurer Microsoft Entra</Link>}
      </div>
      <details className="text-sm text-slate-600">
        <summary className="cursor-pointer">Configuration Microsoft Entra</summary>
        <p className="mt-2">Ajoute cette URI de redirection Web à l’inscription d’application Microsoft 365.</p>
        <code className="break-all">{callbackUrl}</code>
        <p className="mt-2">Permissions déléguées Microsoft Graph <code>Tasks.Read</code> pour les plans et <code>User.ReadBasic.All</code> pour les noms des responsables.</p>
      </details>

      {connected && <button type="button" className="button-secondary" disabled={pending} onClick={loadPlans}>Charger les plans</button>}
      {plans && plans.length === 0 && <p className="text-sm text-slate-600">Aucun plan standard accessible avec ce compte.</p>}
      {plans && plans.length > 0 && (
        <form onSubmit={submit} className="grid items-end gap-3 md:grid-cols-[1fr_1fr_auto]">
          <label><span className="field-label">Plan Planner</span><select required className="field-select" value={planId} onChange={(event) => {
            const id = event.target.value;
            setPlanId(id);
            setProjectId(linked.find((plan) => plan.key === id)?.projectId ?? initialProjectId);
          }}>
            <option value="">Choisir un plan</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.title}</option>)}
          </select></label>
          <label><span className="field-label">Projet DSI</span><select required className="field-select" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">Choisir un projet</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
          </select></label>
          <button className="button-primary" disabled={pending}>Rattacher et synchroniser</button>
        </form>
      )}
      {linked.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {linked.map((plan) => (
            <li key={plan.key} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div>
                <p className="text-sm font-semibold">{plan.title}</p>
                <p className="text-xs text-slate-600">
                  <Link className="pilot-row-link" href={`/projects/${plan.projectId}#external-tracking`}>{projects.find((project) => project.id === plan.projectId)?.title}</Link>
                  {" · "}{plan.lastSyncedAt ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(plan.lastSyncedAt)) : "Jamais synchronisé"}
                </p>
              </div>
              {connected && <button type="button" className="button-secondary" disabled={pending} onClick={() => sync(plan.key, plan.projectId)}>Synchroniser<span className="sr-only"> {plan.title}</span></button>}
            </li>
          ))}
        </ul>
      )}
      {pending && <p role="status" className="text-sm text-slate-600">Chargement…</p>}
      {feedback && <p role={feedback.error ? "alert" : "status"} className={`text-sm ${feedback.error ? "text-rose-700" : "text-emerald-800"}`}>{feedback.message}</p>}
    </section>
  );
}
