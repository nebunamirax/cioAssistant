import Link from "next/link";
import { EmailLinkForm } from "@/components/emails/email-link-form";
import { OutlookControls } from "@/components/emails/outlook-controls";
import { prisma } from "@/lib/db/prisma";
import { getOutlookConnectionStatus } from "@/lib/integrations/outlook";
import { loadAppSettingsSync } from "@/lib/settings/service";
import { getEmailById, listEmails } from "@/lib/services/email-service";

type EmailsPageProps = {
  searchParams?: {
    search?: string;
    selectedId?: string;
    m365?: string;
    m365Error?: string;
  };
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export default async function EmailsPage({ searchParams }: EmailsPageProps) {
  const filters = {
    search: searchParams?.search
  };
  const [emails, selectedEmail, projects, actions] = await Promise.all([
    listEmails(filters),
    searchParams?.selectedId ? getEmailById(searchParams.selectedId) : null,
    prisma.project.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.action.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } })
  ]);
  const outlookStatus = getOutlookConnectionStatus();
  const settings = loadAppSettingsSync();
  const projectOptions = projects.map((project) => ({ id: project.id, label: project.title }));
  const actionOptions = actions.map((action) => ({ id: action.id, label: action.title }));
  const createdCount = emails.filter((email) => email.automationStatus === "CREATED").length;
  const reviewCount = emails.filter((email) => email.automationStatus === "REVIEW").length;
  const baseParams = new URLSearchParams();

  if (searchParams?.search) {
    baseParams.set("search", searchParams.search);
  }

  const buildSelectionHref = (selectedId?: string) => {
    const params = new URLSearchParams(baseParams);

    if (selectedId) {
      params.set("selectedId", selectedId);
    }

    const query = params.toString();
    return query ? `/emails?${query}` : "/emails";
  };

  return (
    <div className="space-y-4">
      <section className="workbench-header">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-950">Emails</h1>
          <p className="text-sm text-slate-600">
            Connecte Outlook, synchronise la boite de reception et rattache les messages utiles aux projets et actions.
          </p>
          <div className="workbench-kpi-grid">
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Emails locaux</div>
              <div className="workbench-kpi-value">{emails.length}</div>
            </div>
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Connexion</div>
              <div className="workbench-kpi-value">{outlookStatus.connected ? "Active" : "Hors ligne"}</div>
            </div>
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Auto cree / revue</div>
              <div className="workbench-kpi-value">{createdCount} / {reviewCount}</div>
            </div>
          </div>
        </div>
        {selectedEmail ? (
          <Link href={buildSelectionHref()} className="button-secondary">
            Fermer le panneau
          </Link>
        ) : null}
      </section>

      {searchParams?.m365 === "connected" ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Connexion Microsoft 365 etablie. Tu peux maintenant synchroniser la boite Outlook.
        </p>
      ) : null}
      {searchParams?.m365Error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {searchParams.m365Error}
        </p>
      ) : null}

      <OutlookControls
        configured={outlookStatus.configured}
        connected={outlookStatus.connected}
        accountEmail={outlookStatus.accountEmail}
        lastSyncedAt={outlookStatus.lastSyncedAt}
        pollingEnabled={settings.integrations.outlookPollingEnabled}
        pollingIntervalMinutes={settings.integrations.outlookPollingIntervalMinutes}
        automationEnabled={settings.integrations.outlookAutomationEnabled}
        automationCategory={settings.integrations.outlookAutomationCategory}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr),420px]">
        <section className="space-y-4">
          <form className="workbench-panel" action="/emails">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr),auto]">
              <label>
                <span className="field-label">Recherche</span>
                <input
                  name="search"
                  defaultValue={searchParams?.search ?? ""}
                  className="field-input"
                  placeholder="Sujet, expediteur, extrait..."
                />
              </label>
              <div className="flex items-end">
                <button type="submit" className="button-secondary">Filtrer</button>
              </div>
            </div>
          </form>

          <div className="workbench-table-shell">
            <table className="workbench-table">
              <thead>
                <tr>
                  <th>Sujet</th>
                  <th>Expediteur</th>
                  <th>Reception</th>
                  <th>Categories</th>
                  <th>Rattachement</th>
                  <th>Automatisation</th>
                </tr>
              </thead>
              <tbody>
                {emails.map((email) => (
                  <tr key={email.id} data-selected={searchParams?.selectedId === email.id}>
                    <td>
                      <Link href={buildSelectionHref(email.id)} className="font-medium text-slate-900 hover:underline">
                        {email.subject}
                      </Link>
                      <div className="mt-1 max-w-[38rem] truncate text-xs text-slate-500">{email.snippet ?? "Aucun extrait"}</div>
                    </td>
                    <td>
                      <div>{email.metadata?.fromName ?? "Expediteur inconnu"}</div>
                      <div className="text-xs text-slate-500">{email.fromEmail}</div>
                    </td>
                    <td>{formatDate(email.receivedAt)}</td>
                    <td>
                      <div className="max-w-[12rem] text-sm text-slate-700">
                        {email.categories.length > 0 ? email.categories.join(", ") : "-"}
                      </div>
                    </td>
                    <td>
                      <div>{email.linkedProject?.title ? `Projet: ${email.linkedProject.title}` : "Projet: -"}</div>
                      <div>{email.linkedAction?.title ? `Action: ${email.linkedAction.title}` : "Action: -"}</div>
                    </td>
                    <td>
                      <div>{email.automationStatus}</div>
                      <div className="text-xs text-slate-500">
                        {email.automationSummary ?? (email.metadata?.isRead ? "Lu" : "Non lu")}
                      </div>
                    </td>
                  </tr>
                ))}
                {emails.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-slate-500">Aucun email synchronise.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <section className="workbench-panel">
            <div className="mb-4">
              <h2 className="panel-title">{selectedEmail ? "Email selectionne" : "Aucune selection"}</h2>
              <p className="panel-caption">
                {selectedEmail ? "Consulte le contexte et rattache l'email aux objets metier." : "Selectionne un email pour voir le detail et le lier."}
              </p>
            </div>

            {selectedEmail ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Sujet</div>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{selectedEmail.subject}</p>
                  <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Expediteur</div>
                  <p className="mt-1 text-sm text-slate-700">
                    {selectedEmail.metadata?.fromName ? `${selectedEmail.metadata.fromName} <${selectedEmail.fromEmail}>` : selectedEmail.fromEmail}
                  </p>
                  <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Extrait</div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{selectedEmail.snippet ?? "Aucun extrait disponible."}</p>
                  <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Automatisation</div>
                  <p className="mt-1 text-sm text-slate-700">{selectedEmail.automationStatus}</p>
                  {selectedEmail.automationSummary ? (
                    <p className="mt-1 text-sm text-slate-600">{selectedEmail.automationSummary}</p>
                  ) : null}
                  <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Categories Outlook</div>
                  <p className="mt-1 text-sm text-slate-700">{selectedEmail.categories.length > 0 ? selectedEmail.categories.join(", ") : "Aucune"}</p>
                  {selectedEmail.metadata?.webLink ? (
                    <p className="mt-3">
                      <a href={selectedEmail.metadata.webLink} target="_blank" rel="noreferrer" className="text-sm text-slate-900 hover:underline">
                        Ouvrir dans Outlook
                      </a>
                    </p>
                  ) : null}
                </div>

                <EmailLinkForm
                  emailId={selectedEmail.id}
                  projectOptions={projectOptions}
                  actionOptions={actionOptions}
                  initialProjectId={selectedEmail.linkedProjectId}
                  initialActionId={selectedEmail.linkedActionId}
                />
              </div>
            ) : (
              <p className="text-sm text-slate-500">Aucun email selectionne.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
