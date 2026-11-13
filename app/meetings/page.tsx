import Link from "next/link";
import { MeetingDeleteButton } from "@/components/meetings/meeting-delete-button";
import { MeetingFilters } from "@/components/meetings/meeting-filters";
import { MeetingForm } from "@/components/meetings/meeting-form";
import { prisma } from "@/lib/db/prisma";
import { getMeetingNoteById, listMeetingNotes } from "@/lib/services/meeting-note-service";
import type { MeetingNoteFilters as MeetingNoteFiltersInput } from "@/lib/validation/meeting-note";

type MeetingsPageProps = {
  searchParams?: Promise<{
    search?: string;
    projectId?: string;
    selectedId?: string;
  }>;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(value);
}

export default async function MeetingsPage({ searchParams: searchParamsPromise }: MeetingsPageProps) {
  const searchParams = await searchParamsPromise;
  const filters: MeetingNoteFiltersInput = {
    search: searchParams?.search,
    projectId: searchParams?.projectId
  };

  const [meetingNotes, projects, selectedMeetingNote, linked] = await Promise.all([
    listMeetingNotes(filters),
    prisma.project.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    searchParams?.selectedId ? getMeetingNoteById(searchParams.selectedId) : null,
    searchParams?.selectedId ? prisma.meetingNote.findUnique({
      where: { id: searchParams.selectedId },
      select: { actions: { select: { id: true, title: true } }, risks: { select: { id: true, title: true } }, decisions: { select: { id: true, subject: true } } }
    }) : null
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

  const totalExtractedItems = meetingNotes.reduce(
    (total, meeting) =>
      total +
      meeting.extractedActions.length +
      meeting.extractedDecisions.length +
      meeting.extractedRisks.length +
      meeting.extractedDeadlines.length,
    0
  );
  const createdActions = meetingNotes.reduce(
    (total, meeting) => total + meeting.extractedActions.filter((action) => action.createdActionId).length,
    0
  );

  return (
    <div className="space-y-4">
      <header className="workbench-header">
        <div>
          <h1 className="text-2xl font-semibold">Réunions</h1>
          <p className="mt-2 text-sm text-slate-600">{meetingNotes.length} réunions · {totalExtractedItems} éléments relevés · {createdActions} actions créées</p>
        </div>
        <Link href="/meetings#compte-rendu" className="button-primary">Nouveau compte rendu</Link>
      </header>

      <div className="grid gap-4 xl:grid-cols-[340px,minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <section className="workbench-panel">
            <div className="mb-3 space-y-1">
              <h2 className="panel-title">Historique</h2>
            </div>
            <MeetingFilters values={filters} projectOptions={projects} />
          </section>

          <section className="workbench-panel">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="panel-title">Liste</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{meetingNotes.length}</span>
            </div>
            <div className="space-y-2">
              {meetingNotes.map((meetingNote) => {
                const isSelected = searchParams?.selectedId === meetingNote.id;
                const extractedCount =
                  meetingNote.extractedActions.length +
                  meetingNote.extractedDecisions.length +
                  meetingNote.extractedRisks.length +
                  meetingNote.extractedDeadlines.length;

                return (
                  <Link
                    key={meetingNote.id}
                    href={buildSelectionHref(meetingNote.id)}
                    className={[
                      "block rounded-2xl border px-3 py-3 transition",
                      isSelected
                        ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={["truncate text-sm font-semibold", isSelected ? "text-white" : "text-slate-950"].join(" ")}>
                          {meetingNote.title}
                        </p>
                        <p className={["mt-1 text-xs", isSelected ? "text-slate-300" : "text-slate-500"].join(" ")}>
                          {meetingNote.project?.title ?? "Sans projet"} · {formatShortDate(meetingNote.meetingDate)}
                        </p>
                      </div>
                      <span
                        className={[
                          "rounded-full px-2 py-1 text-[11px] font-semibold",
                          isSelected ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600"
                        ].join(" ")}
                      >
                        {meetingNote.attendees.length} p
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className={["rounded-full px-2 py-1 text-[11px]", isSelected ? "bg-white/10 text-slate-100" : "bg-slate-100 text-slate-600"].join(" ")}>
                        {meetingNote.extractedActions.length} actions
                      </span>
                      <span className={["rounded-full px-2 py-1 text-[11px]", isSelected ? "bg-white/10 text-slate-100" : "bg-slate-100 text-slate-600"].join(" ")}>
                        {extractedCount} extraits
                      </span>
                    </div>
                  </Link>
                );
              })}

              {meetingNotes.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-6 text-sm text-slate-500">
                  Aucune reunion pour le filtre courant.
                </div>
              )}
            </div>
          </section>
        </aside>

        <section className="space-y-4">
          <section id="compte-rendu" className="workbench-panel scroll-mt-20">
            <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-950">
                    {selectedMeetingNote ? "Modifier le compte rendu" : "Nouveau compte rendu"}
                  </h2>
                  {selectedMeetingNote ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {formatDate(selectedMeetingNote.meetingDate)}
                    </span>
                  ) : null}
                </div>
                {selectedMeetingNote ? (
                  <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">Projet: {selectedMeetingNote.project?.title ?? "Sans projet"}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">Participants: {selectedMeetingNote.attendees.length}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">Actions: {selectedMeetingNote.extractedActions.length}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">
                      Créées · {selectedMeetingNote.extractedActions.filter((action) => action.createdActionId).length}
                    </span>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedMeetingNote ? (
                  <>
                    <Link href={buildSelectionHref()} className="button-secondary">
                      Nouveau compte rendu
                    </Link>
                    <MeetingDeleteButton meetingNoteId={selectedMeetingNote.id} />
                  </>
                ) : null}
              </div>
            </div>
            {linked && (linked.actions.length + linked.risks.length + linked.decisions.length > 0) && <section className="mb-4 rounded-xl border p-3">
              <h3 className="mb-2 font-semibold">Fiches liées</h3>
              <ul className="space-y-1 text-sm">
                {linked.actions.map((item) => <li key={item.id}><Link className="pilot-row-link" href={`/actions?selectedId=${item.id}`}>Action · {item.title}</Link></li>)}
                {linked.risks.map((item) => <li key={item.id}><Link className="pilot-row-link" href={`/risks#${item.id}`}>Risque · {item.title}</Link></li>)}
                {linked.decisions.map((item) => <li key={item.id}><Link className="pilot-row-link" href={`/decisions#${item.id}`}>Décision · {item.subject}</Link></li>)}
              </ul>
            </section>}
            <MeetingForm
              key={selectedMeetingNote?.id ?? "new"}
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
        </section>
      </div>
    </div>
  );
}
