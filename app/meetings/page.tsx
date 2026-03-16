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

function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(value);
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
      <section className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.35)] sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold text-slate-950 sm:text-2xl">Reunions</h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Capture le brut, genere la synthese, puis convertis les suites en actions sans te perdre dans une colonne secondaire interminable.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Reunions</p>
              <p className="mt-1 text-base font-semibold text-slate-950">{meetingNotes.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Extraction</p>
              <p className="mt-1 text-base font-semibold text-slate-950">{totalExtractedItems}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Actions creees</p>
              <p className="mt-1 text-base font-semibold text-slate-950">{createdActions}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Selection</p>
              <p className="mt-1 text-base font-semibold text-slate-950">{selectedMeetingNote ? "1" : "0"}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[340px,minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <section className="workbench-panel">
            <div className="mb-3 space-y-1">
              <h2 className="panel-title">Historique</h2>
              <p className="panel-caption">Filtre puis ouvre une reunion pour la reprendre rapidement.</p>
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
          <section className="workbench-panel">
            <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-950">
                    {selectedMeetingNote ? "Edition de reunion" : "Nouvelle reunion"}
                  </h2>
                  {selectedMeetingNote ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {formatDate(selectedMeetingNote.meetingDate)}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-slate-600">
                  {selectedMeetingNote
                    ? "Le compte-rendu est edite sur une seule surface. Le brut, la synthese et les suites restent visibles ensemble."
                    : "Commence par le brut ou l'audio, puis affine la synthese et les actions dans la meme zone de travail."}
                </p>
                {selectedMeetingNote ? (
                  <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">Projet: {selectedMeetingNote.project?.title ?? "Sans projet"}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">Participants: {selectedMeetingNote.attendees.length}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">Actions: {selectedMeetingNote.extractedActions.length}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">
                      Creees: {selectedMeetingNote.extractedActions.filter((action) => action.createdActionId).length}
                    </span>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedMeetingNote ? (
                  <>
                    <Link href={buildSelectionHref()} className="button-secondary">
                      Nouvelle reunion
                    </Link>
                    <MeetingDeleteButton meetingNoteId={selectedMeetingNote.id} />
                  </>
                ) : null}
              </div>
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
        </section>
      </div>
    </div>
  );
}
