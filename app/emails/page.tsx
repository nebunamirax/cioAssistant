import Link from "next/link";
import { EmailActionForm } from "@/components/emails/email-action-form";
import { EmailLinkForm } from "@/components/emails/email-link-form";
import { OutlookControls } from "@/components/emails/outlook-controls";
import { prisma } from "@/lib/db/prisma";
import { getOutlookConnectionStatus } from "@/lib/integrations/outlook";
import { loadAppSettingsSync } from "@/lib/settings/service";
import { getEmailById, listEmails } from "@/lib/services/email-service";
import { pilotageDate } from "@/lib/services/pilotage-service";

export const dynamic = "force-dynamic";

type EmailsPageProps = {
  searchParams?: Promise<{ search?: string; selectedId?: string; projectId?: string; view?: string; m365?: string; m365Error?: string }>;
};

export default async function EmailsPage({ searchParams: searchParamsPromise }: EmailsPageProps) {
  const searchParams = await searchParamsPromise;
  const { search, selectedId, projectId, view, m365, m365Error } = searchParams ?? {};
  const [emails, selected, projects, actions] = await Promise.all([
    listEmails({ search, linkedProjectId: projectId }),
    selectedId ? getEmailById(selectedId) : null,
    prisma.project.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.action.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } })
  ]);
  const outlook = getOutlookConnectionStatus();
  const { integrations } = loadAppSettingsSync();
  const projectOptions = projects.map(({ id, title }) => ({ id, label: title }));
  const actionOptions = actions.map(({ id, title }) => ({ id, label: title }));
  const unlinked = emails.filter((email) => !email.linkedProjectId && !email.linkedActionId);
  const displayed = view === "unlinked" ? unlinked : emails;

  function inboxHref(id?: string, filter = view) {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (projectId) query.set("projectId", projectId);
    if (filter === "unlinked") query.set("view", filter);
    if (id) query.set("selectedId", id);
    return query.size ? `/emails?${query}` : "/emails";
  }

  return (
    <div className="space-y-5">
      <header className="workbench-header">
        <div><h1 className="text-2xl font-semibold">Boîte de suivi</h1><p className="mt-1 text-sm text-slate-600">Rattache les e-mails Outlook aux projets ou transforme-les en actions.</p></div>
        {projectId && <Link className="button-secondary" href={`/projects/${projectId}`}>Retour au projet</Link>}
      </header>
      {m365 === "connected" && <p role="status" className="workbench-panel text-sm text-emerald-800">Microsoft 365 est connecté. Tu peux synchroniser la boîte de réception.</p>}
      {m365Error && <p role="alert" className="workbench-panel text-sm text-rose-700">{m365Error}</p>}
      <OutlookControls {...outlook} pollingEnabled={integrations.outlookPollingEnabled} pollingIntervalMinutes={integrations.outlookPollingIntervalMinutes} automationEnabled={integrations.outlookAutomationEnabled} automationCategory={integrations.outlookAutomationCategory} />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,1fr)]">
        <section className="pilot-panel overflow-hidden">
          <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 px-4 py-3 text-sm">
            <Link className={view !== "unlinked" ? "pilot-row-link" : "text-slate-600 hover:underline"} href={inboxHref(undefined, "")}>Tous ({emails.length})</Link>
            <Link className={view === "unlinked" ? "pilot-row-link" : "text-slate-600 hover:underline"} href={inboxHref(undefined, "unlinked")}>Sans rattachement ({unlinked.length})</Link>
          </div>
          <form className="flex gap-2 border-b border-slate-200 p-3" action="/emails">
            {projectId && <input type="hidden" name="projectId" value={projectId} />}
            {view === "unlinked" && <input type="hidden" name="view" value="unlinked" />}
            <input name="search" className="field-input min-w-0" defaultValue={search} aria-label="Rechercher un e-mail" placeholder="Sujet, expéditeur ou extrait" />
            <button className="button-secondary">Rechercher</button>
          </form>
          <ul className="divide-y divide-slate-100">
            {displayed.map((email) => (
              <li key={email.id}>
                <Link href={inboxHref(email.id)} aria-current={email.id === selectedId ? "true" : undefined} className={`block px-4 py-3 hover:bg-violet-50 ${email.id === selectedId ? "bg-violet-50" : ""}`}>
                  <div className="flex items-start justify-between gap-3 text-xs text-slate-600"><span className="truncate">{email.metadata?.fromName ?? email.fromEmail}</span><span className="shrink-0">{pilotageDate(email.receivedAt)}</span></div>
                  <p className="mt-1 text-sm font-semibold">{email.subject}</p>
                  <p className="mt-1 truncate text-sm text-slate-600">{email.snippet}</p>
                  {(email.linkedProject || email.linkedAction) && <p className="mt-1 truncate text-xs font-medium text-violet-800">{[email.linkedProject?.title, email.linkedAction?.title].filter(Boolean).join(" · ")}</p>}
                </Link>
              </li>
            ))}
          </ul>
          {!displayed.length && <p className="px-4 py-7 text-sm text-slate-600">Aucun e-mail dans cette vue.</p>}
        </section>
        <aside className="workbench-panel space-y-4">
          {selected ? (
            <>
              <div className="flex items-start justify-between gap-3"><h2 className="break-words text-lg font-semibold">{selected.subject}</h2><Link href={inboxHref()} className="text-sm text-slate-600 hover:underline">Fermer</Link></div>
              <p className="break-words text-sm text-slate-600">{selected.fromEmail} · {pilotageDate(selected.receivedAt)}</p>
              <p className="whitespace-pre-wrap break-words text-sm">{selected.snippet ?? "Aucun extrait disponible."}</p>
              {selected.categories.length > 0 && <p className="text-xs text-slate-600">{selected.categories.join(", ")}</p>}
              {selected.automationSummary && <p className="text-sm text-slate-600">{selected.automationSummary}</p>}
              {selected.metadata?.webLink?.startsWith("https://") && <a href={selected.metadata.webLink} target="_blank" rel="noreferrer" className="pilot-row-link block text-sm">Ouvrir dans Outlook ↗</a>}
              {selected.linkedActionId ? (
                <Link className="pilot-row-link block text-sm" href={`/actions?selectedId=${selected.linkedActionId}`}>Voir l’action liée →</Link>
              ) : <EmailActionForm key={selected.id} emailId={selected.id} subject={selected.subject} projectId={selected.linkedProjectId} projects={projectOptions} />}
              <EmailLinkForm emailId={selected.id} projectOptions={projectOptions} actionOptions={actionOptions} initialProjectId={selected.linkedProjectId} initialActionId={selected.linkedActionId} />
            </>
          ) : <p className="text-sm text-slate-600">Sélectionne un e-mail pour consulter son extrait et le rattacher au suivi.</p>}
        </aside>
      </div>
    </div>
  );
}
