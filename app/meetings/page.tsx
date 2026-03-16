import Link from "next/link";
import { MeetingDeleteButton } from "@/components/meetings/meeting-delete-button";
import { MeetingFilters } from "@/components/meetings/meeting-filters";
import { MeetingForm } from "@/components/meetings/meeting-form";
import { prisma } from "@/lib/db/prisma";
import { getMeetingNoteById, listMeetingNotes } from "@/lib/services/meeting-note-service";
import type { MeetingNoteFilters as MeetingNoteFiltersInput } from "@/lib/validation/meeting-note";

type MeetingsPageProps = {
  searchParams?: {
    search?: string;
    projectId?: string;
    selectedId?: string;
  };
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export default async function MeetingsPage({ searchParams }: MeetingsPageProps) {
  const filters: MeetingNoteFiltersInput = {
    search: searchParams?.search,
    projectId: searchParams?.projectId
  };

  const [meetingNotes, projects, selectedMeetingNote] = await Promise.all([
    listMeetingNotes(filters),
    prisma.project.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    searchParams?.selectedId ? getMeetingNoteById(searchParams.selectedId) : null
  ]);
  const baseParams = new URLSearchParams();

  if (searchParams?.search) baseParams.set("search", searchParams.search);
  if (searchParams?.projectId) baseParams.set("projectId", searchParams.projectId);

  const buildSelectionHref = (selectedId?: string) => {
    const params = new URLSearchParams(baseParams);

    if (selectedId) {
      params.set("selectedId", selectedId);
    }

    const query = params.toString();
    return query ? `/meetings?${query}` : "/meetings";
  };

  return (
    <div className="space-y-4">
      <div className="workbench-header">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Reunions</h1>
          <p className="text-sm text-slate-600">Centralise les comptes-rendus, la synthese et les suites a donner sur une seule surface de travail.</p>
          <div className="workbench-kpi-grid">
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Reunions</div>
              <div className="workbench-kpi-value">{meetingNotes.length}</div>
            </div>
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Actions extraites</div>
              <div className="workbench-kpi-value">{meetingNotes.reduce((total, meeting) => total + meeting.extractedActions.length, 0)}</div>
            </div>
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Actions creees</div>
              <div className="workbench-kpi-value">{meetingNotes.reduce((total, meeting) => total + meeting.extractedActions.filter((action) => action.createdActionId).length, 0)}</div>
            </div>
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Selection</div>
              <div className="workbench-kpi-value">{selectedMeetingNote ? "1" : "0"}</div>
            </div>
          </div>
        </div>
        {selectedMeetingNote && (
          <Link href={buildSelectionHref()} className="button-secondary">
            Fermer le panneau
          </Link>
        )}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr),460px]">
        <section className="space-y-4">
          <MeetingFilters values={filters} projectOptions={projects} />
          <div className="workbench-table-shell">
            <table className="workbench-table">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Projet</th>
                  <th>Date</th>
                  <th>Participants</th>
                  <th>Extraction</th>
                  <th>Modifier</th>
                </tr>
              </thead>
              <tbody>
                {meetingNotes.map((meetingNote) => (
                  <tr key={meetingNote.id} data-selected={searchParams?.selectedId === meetingNote.id}>
                    <td>
                      <Link href={buildSelectionHref(meetingNote.id)} className="font-medium text-slate-900 hover:underline">
                        {meetingNote.title}
                      </Link>
                    </td>
                    <td>{meetingNote.project?.title ?? "—"}</td>
                    <td>{formatDate(meetingNote.meetingDate)}</td>
                    <td>{meetingNote.attendees.length}</td>
                    <td>{meetingNote.extractedActions.length + meetingNote.extractedDecisions.length + meetingNote.extractedRisks.length + meetingNote.extractedDeadlines.length}</td>
                    <td>
                      <Link href={buildSelectionHref(meetingNote.id)} className="text-slate-900 hover:underline">
                        Modifier
                      </Link>
                    </td>
                  </tr>
                ))}
                {meetingNotes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-slate-500">
                      Aucune reunion.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <section className="workbench-panel">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="panel-title">
                  {selectedMeetingNote ? "Editer la reunion" : "Nouvelle reunion"}
                </h2>
                <p className="panel-caption">
                  {selectedMeetingNote ? "Ajuste le compte-rendu existant directement dans les champs pre-remplis." : "Saisis une reunion manuellement en attendant l’alimentation automatique par IA et audio."}
                </p>
              </div>
              {selectedMeetingNote && <MeetingDeleteButton meetingNoteId={selectedMeetingNote.id} />}
            </div>
            <MeetingForm
              mode={selectedMeetingNote ? "edit" : "create"}
              meetingNoteId={selectedMeetingNote?.id}
              projectOptions={projects}
              initialValues={selectedMeetingNote ? {
                projectId: selectedMeetingNote.projectId ?? "",
                title: selectedMeetingNote.title,
                meetingDate: new Date(selectedMeetingNote.meetingDate).toISOString().slice(0, 16),
                attendees: selectedMeetingNote.attendees,
                rawContent: selectedMeetingNote.rawContent,
                summary: selectedMeetingNote.summary ?? "",
                extractedActions: selectedMeetingNote.extractedActions,
                extractedDecisions: selectedMeetingNote.extractedDecisions,
                extractedRisks: selectedMeetingNote.extractedRisks,
                extractedDeadlines: selectedMeetingNote.extractedDeadlines
              } : undefined}
              showHeader={false}
            />
          </section>

          {selectedMeetingNote && (
            <section className="workbench-panel panel-stat-list">
              <h3 className="panel-title">Contexte</h3>
              <p><strong>Projet:</strong> {selectedMeetingNote.project?.title ?? "—"}</p>
              <p><strong>Date:</strong> {formatDate(selectedMeetingNote.meetingDate)}</p>
              <p><strong>Participants:</strong> {selectedMeetingNote.attendees.length}</p>
              <p><strong>Actions:</strong> {selectedMeetingNote.extractedActions.length}</p>
              <p><strong>Actions creees:</strong> {selectedMeetingNote.extractedActions.filter((action) => action.createdActionId).length}</p>
              <p><strong>Decisions:</strong> {selectedMeetingNote.extractedDecisions.length}</p>
              <p><strong>Risques:</strong> {selectedMeetingNote.extractedRisks.length}</p>
              <p><strong>Echeances:</strong> {selectedMeetingNote.extractedDeadlines.length}</p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
