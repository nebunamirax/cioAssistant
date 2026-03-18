import Link from "next/link";
import { ActionDeleteButton } from "@/components/actions/action-delete-button";
import { ActionForm } from "@/components/actions/action-form";
import { ActionFilters } from "@/components/actions/action-filters";
import { ActionKanbanView } from "@/components/actions/action-kanban-view";
import { ACTION_STATUSES, PRIORITIES } from "@/lib/domain/constants";
import { getActionById, listActions } from "@/lib/services/action-service";
import type { ActionFilters as ActionFiltersInput } from "@/lib/validation/action";

type ActionsPageProps = {
  searchParams?: {
    search?: string;
    status?: string;
    priority?: string;
    overdueOnly?: string;
    selectedId?: string;
    view?: string;
  };
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

export default async function ActionsPage({ searchParams }: ActionsPageProps) {
  const status: ActionFiltersInput["status"] = searchParams?.status && isActionStatus(searchParams.status)
    ? searchParams.status
    : undefined;
  const priority: ActionFiltersInput["priority"] = searchParams?.priority && isPriority(searchParams.priority)
    ? searchParams.priority
    : undefined;
  const view = isView(searchParams?.view) ? searchParams?.view : "list";
  const filters: ActionFiltersInput = {
    search: searchParams?.search,
    status,
    priority,
    overdueOnly: searchParams?.overdueOnly === "true"
  };
  const [actions, selectedAction] = await Promise.all([
    listActions(filters),
    searchParams?.selectedId ? getActionById(searchParams.selectedId) : null
  ]);

  const selectedActionStatus = selectedAction && ACTION_STATUSES.includes(selectedAction.status as (typeof ACTION_STATUSES)[number])
    ? (selectedAction.status as (typeof ACTION_STATUSES)[number])
    : "TODO";
  const selectedActionPriority = selectedAction && PRIORITIES.includes(selectedAction.priority as (typeof PRIORITIES)[number])
    ? (selectedAction.priority as (typeof PRIORITIES)[number])
    : "NORMAL";
  const baseParams = new URLSearchParams();

  if (searchParams?.search) baseParams.set("search", searchParams.search);
  if (status) baseParams.set("status", status);
  if (priority) baseParams.set("priority", priority);
  if (searchParams?.overdueOnly === "true") baseParams.set("overdueOnly", "true");
  if (view === "kanban") baseParams.set("view", "kanban");

  const buildSelectionHref = (selectedId?: string) => {
    const params = new URLSearchParams(baseParams);

    if (selectedId) {
      params.set("selectedId", selectedId);
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

    if (searchParams?.selectedId) {
      params.set("selectedId", searchParams.selectedId);
    }

    const query = params.toString();
    return query ? `/actions?${query}` : "/actions";
  };

  const kanbanActions = actions.map((action) => ({
    id: action.id,
    title: action.title,
    ownerName: action.ownerName ?? null,
    status: ACTION_STATUSES.includes(action.status as (typeof ACTION_STATUSES)[number])
      ? (action.status as (typeof ACTION_STATUSES)[number])
      : "TODO",
    priority: action.priority,
    dueDate: action.dueDate ? new Date(action.dueDate).toISOString() : null,
    projectTitle: action.project?.title ?? null
  }));

  return (
    <div className="space-y-4">
      <div className="workbench-header">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Actions</h1>
          <p className="text-sm text-slate-600">Pilote les tâches dans une vue compacte avec bascule liste ou kanban, sélection, édition et contexte sur le même écran.</p>
          <div className="workbench-kpi-grid">
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Total</div>
              <div className="workbench-kpi-value">{actions.length}</div>
            </div>
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">En retard</div>
              <div className="workbench-kpi-value">{actions.filter((action) => action.dueDate && action.status !== "DONE" && action.dueDate < new Date()).length}</div>
            </div>
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Sélection</div>
              <div className="workbench-kpi-value">{selectedAction ? "1" : "0"}</div>
            </div>
          </div>
          <div className="inline-flex w-fit rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <Link
              href={buildViewHref("list")}
              className={`rounded-xl px-3 py-2 text-sm font-medium ${view === "list" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-950"}`}
            >
              Vue liste
            </Link>
            <Link
              href={buildViewHref("kanban")}
              className={`rounded-xl px-3 py-2 text-sm font-medium ${view === "kanban" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-950"}`}
            >
              Vue kanban
            </Link>
          </div>
        </div>
        {selectedAction && (
          <Link href={buildSelectionHref()} className="button-secondary">
            Fermer le panneau
          </Link>
        )}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr),420px]">
        <section className="space-y-4">
          <ActionFilters values={filters} view={view} />
          {view === "kanban" ? (
            <ActionKanbanView
              actions={kanbanActions}
              selectedId={searchParams?.selectedId}
              baseSearchParams={baseParams.toString()}
            />
          ) : (
            <div className="workbench-table-shell">
              <table className="workbench-table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Responsable</th>
                    <th>Statut</th>
                    <th>Priorité</th>
                    <th>Projet</th>
                    <th>Échéance</th>
                    <th>Modifier</th>
                  </tr>
                </thead>
                <tbody>
                  {actions.map((action) => (
                    <tr key={action.id} data-selected={searchParams?.selectedId === action.id}>
                      <td>
                        <Link href={buildSelectionHref(action.id)} className="font-medium text-slate-900 hover:underline">
                          {action.title}
                        </Link>
                      </td>
                      <td>{action.ownerName ?? "—"}</td>
                      <td>{action.status}</td>
                      <td>{action.priority}</td>
                      <td>{action.project?.title ?? "—"}</td>
                      <td>{action.dueDate ? new Intl.DateTimeFormat("fr-FR").format(action.dueDate) : "—"}</td>
                      <td>
                        <Link href={buildSelectionHref(action.id)} className="text-slate-900 hover:underline">
                          Modifier
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {actions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-slate-500">
                        Aucune action.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <section className="workbench-panel">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="panel-title">
                  {selectedAction ? "Éditer l'action" : "Nouvelle action"}
                </h2>
                <p className="panel-caption">
                  {selectedAction ? "Modifie directement les champs préremplis ci-dessous." : "Sélectionne une ligne ou crée directement une nouvelle action."}
                </p>
              </div>
              {selectedAction && <ActionDeleteButton actionId={selectedAction.id} />}
            </div>
            <ActionForm
              mode={selectedAction ? "edit" : "create"}
              actionId={selectedAction?.id}
              initialValues={selectedAction ? {
                title: selectedAction.title,
                description: selectedAction.description ?? "",
                ownerName: selectedAction.ownerName ?? "",
                status: selectedActionStatus,
                priority: selectedActionPriority,
                dueDate: selectedAction.dueDate ? new Date(selectedAction.dueDate).toISOString().slice(0, 16) : "",
                projectId: selectedAction.projectId ?? ""
              } : undefined}
              showHeader={false}
            />
          </section>

          {selectedAction && (
            <section className="workbench-panel panel-stat-list">
              <h3 className="panel-title">Contexte</h3>
              <p><strong>Projet:</strong> {selectedAction.project?.title ?? "—"}</p>
              <p><strong>Responsable:</strong> {selectedAction.ownerName ?? "—"}</p>
              <p><strong>Fournisseur:</strong> {selectedAction.vendor?.name ?? "—"}</p>
              <p><strong>Contrat:</strong> {selectedAction.contract?.title ?? "—"}</p>
              <p><strong>Source:</strong> {selectedAction.sourceType === "MEETING_NOTE" ? selectedAction.sourceRef ?? "Réunion" : selectedAction.sourceRef ?? "—"}</p>
              <p><strong>Créée le:</strong> {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(selectedAction.createdAt)}</p>
              <p><strong>Terminée le:</strong> {selectedAction.completedAt ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(selectedAction.completedAt) : "—"}</p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
