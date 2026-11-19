import { ActionNoteForm } from "@/components/actions/action-note-form";
import { requireMember } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { actionLabels, priorityLabels } from "@/lib/domain/display-labels";
import { ActionDeleteButton } from "@/components/actions/action-delete-button";
import { ActionForm } from "@/components/actions/action-form";
import { ActionFilters } from "@/components/actions/action-filters";
import { ActionKanbanView } from "@/components/actions/action-kanban-view";
import { ACTION_STATUSES, PRIORITIES } from "@/lib/domain/constants";
import { getActionById, listActions } from "@/lib/services/action-service";
import { pilotageDate } from "@/lib/services/pilotage-service";
import type { ActionFilters as ActionFiltersInput } from "@/lib/validation/action";

type ActionsPageProps = {
  searchParams?: Promise<{
    search?: string;
    status?: string;
    priority?: string;
    projectId?: string;
    unassigned?: string;
    openOnly?: string;
    overdueOnly?: string;
    selectedId?: string;
    note?: string;
    new?: string;
    view?: string;
  }>;
};

type ActionStatusValue = NonNullable<ActionFiltersInput["status"]>;
type PriorityValue = NonNullable<ActionFiltersInput["priority"]>;

function isActionStatus(value: string): value is ActionStatusValue {
  return ACTION_STATUSES.includes(value as (typeof ACTION_STATUSES)[number]);
}

function isPriority(value: string): value is PriorityValue {
  return PRIORITIES.includes(value as (typeof PRIORITIES)[number]);
}

function isView(value: string | undefined): value is "list" | "kanban" {
  return value === "list" || value === "kanban";
}

export default async function ActionsPage({ searchParams: searchParamsPromise }: ActionsPageProps) {
  const now = new Date();
  const actor = await requireMember();
  const apprentice = actor.role !== "DSI";
  const searchParams = await searchParamsPromise;
  const status: ActionFiltersInput["status"] = searchParams?.status && isActionStatus(searchParams.status)
    ? searchParams.status
    : undefined;
  const priority: ActionFiltersInput["priority"] = searchParams?.priority && isPriority(searchParams.priority)
    ? searchParams.priority
    : undefined;
  const view = isView(searchParams?.view) ? searchParams?.view : "list";
  const unassigned = searchParams?.unassigned === "true" || searchParams?.projectId === "__unassigned";
  const projectId = !unassigned && typeof searchParams?.projectId === "string" && searchParams.projectId.trim().length <= 250
    ? searchParams.projectId.trim() || undefined
    : undefined;
  const search = typeof searchParams?.search === "string" ? searchParams.search : undefined;
  const selectedId = typeof searchParams?.selectedId === "string" ? searchParams.selectedId : undefined;
  const filters: ActionFiltersInput = {
    search,
    status,
    priority,
    projectId,
    unassigned,
    openOnly: searchParams?.openOnly === "true",
    overdueOnly: searchParams?.overdueOnly === "true"
  };
  const [actions, selectedAction, members, projectOptions, notes] = await Promise.all([
    listActions(filters),
    selectedId ? getActionById(selectedId) : null,
    apprentice ? undefined : prisma.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
    prisma.project.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
    selectedId ? prisma.note.findMany({ where: { entityType: "ACTION", entityId: selectedId }, orderBy: { createdAt: "desc" } }) : []

  ]);

  const canEdit = !apprentice || !selectedAction || selectedAction.ownerId === actor.id;
  const selectedActionStatus = selectedAction && ACTION_STATUSES.includes(selectedAction.status as (typeof ACTION_STATUSES)[number])
    ? (selectedAction.status as (typeof ACTION_STATUSES)[number])
    : "TODO";
  const selectedActionPriority = selectedAction && PRIORITIES.includes(selectedAction.priority as (typeof PRIORITIES)[number])
    ? (selectedAction.priority as (typeof PRIORITIES)[number])
    : "NORMAL";
  const baseParams = new URLSearchParams();

  if (search) baseParams.set("search", search);
  if (status) baseParams.set("status", status);
  if (priority) baseParams.set("priority", priority);
  if (projectId) baseParams.set("projectId", projectId);
  if (filters.unassigned) baseParams.set("unassigned", "true");
  if (filters.openOnly) baseParams.set("openOnly", "true");
  if (searchParams?.overdueOnly === "true") baseParams.set("overdueOnly", "true");
  if (view === "kanban") baseParams.set("view", "kanban");

  const panelOpen = Boolean(selectedAction || searchParams?.new === "1");

  const buildSelectionHref = (selectedId?: string, create = false) => {
    const params = new URLSearchParams(baseParams);

    if (selectedId) {
      params.set("selectedId", selectedId);
    } else if (create) {
      params.set("new", "1");
    }

    const query = params.toString();
    return query ? `/actions?${query}` : "/actions";
  };

  const buildViewHref = (nextView: "list" | "kanban") => {
    const params = new URLSearchParams(baseParams);

    if (nextView === "kanban") {
      params.set("view", "kanban");
    } else {
      params.delete("view");
    }

    if (selectedId) {
      params.set("selectedId", selectedId);
    } else if (searchParams?.new === "1") {
      params.set("new", "1");
    }

    const query = params.toString();
    return query ? `/actions?${query}` : "/actions";
  };

  const closeHref = buildSelectionHref() + (view === "kanban" && selectedAction && actions.some((item) => item.id === selectedAction.id)
    ? `#action-${encodeURIComponent(selectedAction.id)}` : "#actions-results");
  const notesQuery = baseParams.toString();

  const kanbanActions = actions.map((action) => ({
    id: action.id,
    title: action.title,
    ownerName: action.owner?.name ?? action.ownerName ?? null,
    status: ACTION_STATUSES.includes(action.status as (typeof ACTION_STATUSES)[number])
      ? (action.status as (typeof ACTION_STATUSES)[number])
      : "TODO",
    priority: action.priority,
    dueDate: action.dueDate ? new Date(action.dueDate).toISOString() : null,
    projectTitle: action.project?.title ?? null
  }));

  return (
    <div className="space-y-4">
      <header className="workbench-header">
        <div className="space-y-2">
          <h1 className="workspace-page-title">Actions</h1>
          {projectId && <Link className="pilot-row-link text-sm" href={`/roadmap?project=${encodeURIComponent(projectId)}`}>← Planning du projet</Link>}
          <p className="text-sm text-slate-600">{actions.length} {actions.length === 1 ? "action affichée" : "actions affichées"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="workspace-segment" aria-label="Affichage des actions">
            <Link
              href={buildViewHref("list")} aria-current={view === "list" ? "true" : undefined}
              className="workspace-segment-link"
            >
              Liste
            </Link>
            <Link
              href={buildViewHref("kanban")} aria-current={view === "kanban" ? "true" : undefined}
              className="workspace-segment-link"
            >
              Kanban
            </Link>
          </div>
          {panelOpen ? (
            <Link href={closeHref} className="button-secondary">Fermer</Link>
          ) : (
            <Link href={buildSelectionHref(undefined, true)} className="button-primary">Nouvelle action</Link>
          )}
        </div>
      </header>
      <div className={panelOpen ? "workspace-split" : "space-y-4"}>
        <section className="min-w-0 space-y-4" id="actions-results">
          <ActionFilters key={baseParams.toString()} values={filters} view={view} projects={projectOptions} />
          {view === "kanban" ? (
            <ActionKanbanView
              actions={kanbanActions}
              now={now.getTime()}
              selectedId={selectedId}
              baseSearchParams={baseParams.toString()}
            />
          ) : (
            <div className="workbench-table-shell">
              <ul className="workspace-feed border-t-0 sm:hidden" aria-label="Actions">
                {actions.map((action) => <li key={action.id}>
                  <Link href={buildSelectionHref(action.id) + "#action-detail"} className="workspace-feed-row" aria-current={selectedId === action.id ? "true" : undefined}>
                    <span className="workspace-feed-text">
                      <strong>{action.title}</strong>
                      <span>{[action.project?.title, action.owner?.name ?? action.ownerName, action.dueDate && pilotageDate(action.dueDate)].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="pilot-status" data-status={action.status}>{actionLabels[action.status] ?? action.status}</span>
                  </Link>
                </li>)}
                {!actions.length && <li className="workspace-empty">Aucune action.</li>}
              </ul>
              <table className="workbench-table hidden sm:table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Responsable</th>
                    <th>Statut</th>
                    <th>Priorité</th>
                    <th>Projet</th>
                    <th>Échéance</th>
                  </tr>
                </thead>
                <tbody>
                  {actions.map((action) => (
                    <tr key={action.id} data-selected={selectedId === action.id}>
                      <td>
                        <Link href={buildSelectionHref(action.id) + "#action-detail"} className="font-medium text-slate-900 hover:underline">
                          {action.title}
                        </Link>
                      </td>
                      <td>{action.owner?.name ?? action.ownerName ?? "—"}</td>
                      <td><span className="pilot-status" data-status={action.status}>{actionLabels[action.status] ?? action.status}</span></td>
                      <td>{priorityLabels[action.priority] ?? action.priority}</td>
                      <td>{action.project?.title ?? "—"}</td>
                      <td>{pilotageDate(action.dueDate)}</td>
                    </tr>
                  ))}
                  {actions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-slate-500">
                        Aucune action.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {panelOpen && <aside className="order-first min-w-0 space-y-4 xl:order-none">
          <section className="workbench-panel" id="action-detail">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="panel-title">
                  {selectedAction ? canEdit ? "Modifier l’action" : "Détail de l’action" : "Nouvelle action"}
                </h2>
              </div>
            </div>
            {!canEdit && selectedAction && <p className="text-sm text-slate-600">{actionLabels[selectedAction.status] ?? selectedAction.status} · {selectedAction.title}</p>}
            {canEdit && <ActionForm key={selectedAction?.id ?? "new"}
              apprentice={apprentice}
              members={members}
              projectOptions={projectOptions}
              mode={selectedAction ? "edit" : "create"}
              actionId={selectedAction?.id}
              initialValues={selectedAction ? {
                title: selectedAction.title,
                description: selectedAction.description ?? "",
                ownerId: selectedAction.ownerId,
                ownerName: selectedAction.ownerName ?? "",
                status: selectedActionStatus,
                priority: selectedActionPriority,
                dueDate: selectedAction.dueDate?.toISOString() ?? null,
                projectId: selectedAction.projectId ?? ""
              } : projectId && !filters.unassigned && projectOptions.some((project) => project.id === projectId) ? { projectId } : undefined}
              showHeader={false}
            />}
            {selectedAction && !apprentice && <div className="mt-4 border-t border-slate-200 pt-4"><ActionDeleteButton actionId={selectedAction.id} /></div>}
          </section>

          {selectedAction && (
            <section className="workbench-panel panel-stat-list" id="action-notes">
              <h3 className="panel-title">Contexte</h3>
              {selectedAction.sourceUrl && <p><a href={selectedAction.sourceUrl} rel="noreferrer">Ouvrir le ticket d’origine</a></p>}
              {notes.map((note) => <p key={note.id}><strong>{note.title}</strong> · {note.content}</p>)}
              {canEdit && <ActionNoteForm key={selectedAction.id}
                action={`/api/actions/${encodeURIComponent(selectedAction.id)}/notes${notesQuery ? `?${notesQuery}` : ""}`}
                saved={searchParams?.note === "saved"} />}
              <p><strong>Projet:</strong> {selectedAction.project?.title ?? "—"}</p>
              <p><strong>Responsable:</strong> {selectedAction.owner?.name ?? selectedAction.ownerName ?? "—"}</p>
              <p><strong>Fournisseur:</strong> {selectedAction.vendor?.name ?? "—"}</p>
              <p><strong>Contrat:</strong> {selectedAction.contract?.title ?? "—"}</p>
              <p><strong>Source:</strong> {selectedAction.sourceType === "EMAIL" && selectedAction.sourceRef ? <Link href={`/emails?selectedId=${selectedAction.sourceRef}`} className="pilot-row-link">E-mail d’origine</Link> : selectedAction.sourceRef ?? "—"}</p>
              <p><strong>Créée le:</strong> {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(selectedAction.createdAt)}</p>
              <p><strong>Terminée le:</strong> {selectedAction.completedAt ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(selectedAction.completedAt) : "—"}</p>
            </section>
          )}
        </aside>}
      </div>
    </div>
  );
}
