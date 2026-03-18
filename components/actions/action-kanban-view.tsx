"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ACTION_STATUSES, type ActionStatus } from "@/lib/domain/constants";

type ActionKanbanItem = {
  id: string;
  title: string;
  ownerName: string | null;
  status: ActionStatus;
  priority: string;
  dueDate: string | null;
  projectTitle: string | null;
};

type ActionKanbanViewProps = {
  actions: ActionKanbanItem[];
  selectedId?: string;
  baseSearchParams: string;
};

const priorityStyles: Record<string, string> = {
  LOW: "border-emerald-200 bg-emerald-50 text-emerald-700",
  NORMAL: "border-slate-200 bg-slate-100 text-slate-700",
  HIGH: "border-amber-200 bg-amber-50 text-amber-700",
  CRITICAL: "border-rose-200 bg-rose-50 text-rose-700"
};

const columnDescriptions: Record<ActionStatus, string> = {
  TODO: "A lancer",
  IN_PROGRESS: "En cours",
  BLOCKED: "Bloque",
  WAITING: "En attente",
  DONE: "Termine"
};

const columnAccentStyles: Record<ActionStatus, string> = {
  TODO: "from-slate-200 via-slate-100 to-white",
  IN_PROGRESS: "from-sky-200 via-sky-100 to-white",
  BLOCKED: "from-rose-200 via-rose-100 to-white",
  WAITING: "from-amber-200 via-amber-100 to-white",
  DONE: "from-emerald-200 via-emerald-100 to-white"
};

function formatDueDate(value: string | null) {
  if (!value) {
    return "Sans echeance";
  }

  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function isOverdue(action: ActionKanbanItem) {
  if (!action.dueDate || action.status === "DONE") {
    return false;
  }

  return new Date(action.dueDate) < new Date();
}

export function ActionKanbanView({ actions, selectedId, baseSearchParams }: ActionKanbanViewProps) {
  const router = useRouter();
  const [items, setItems] = useState(actions);
  const [draggedActionId, setDraggedActionId] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [dropTargetStatus, setDropTargetStatus] = useState<ActionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(actions);
  }, [actions]);

  const groupedActions = useMemo(
    () =>
      ACTION_STATUSES.reduce<Record<ActionStatus, ActionKanbanItem[]>>((acc, status) => {
        acc[status] = items.filter((action) => action.status === status);
        return acc;
      }, {} as Record<ActionStatus, ActionKanbanItem[]>),
    [items]
  );

  const buildSelectionHref = (id?: string) => {
    const params = new URLSearchParams(baseSearchParams);

    if (id) {
      params.set("selectedId", id);
    } else {
      params.delete("selectedId");
    }

    const query = params.toString();
    return query ? `/actions?${query}` : "/actions";
  };

  const moveAction = async (actionId: string, nextStatus: ActionStatus) => {
    const currentAction = items.find((item) => item.id === actionId);

    if (!currentAction || currentAction.status === nextStatus) {
      return;
    }

    const previousItems = items;

    setError(null);
    setPendingActionId(actionId);
    setItems((currentItems) =>
      currentItems.map((item) => (item.id === actionId ? { ...item, status: nextStatus } : item))
    );

    const response = await fetch(`/api/actions/${actionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setItems(previousItems);
      setError(payload?.error ?? "Impossible de deplacer l'action.");
      setPendingActionId(null);
      return;
    }

    setPendingActionId(null);
    router.refresh();
  };

  return (
    <section className="space-y-3">
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      <div className="action-board-shell">
        {ACTION_STATUSES.map((status) => (
          <div
            key={status}
            onDragOver={(event) => event.preventDefault()}
            onDragEnter={() => setDropTargetStatus(status)}
            onDragLeave={() => {
              if (dropTargetStatus === status) {
                setDropTargetStatus(null);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();

              if (draggedActionId) {
                void moveAction(draggedActionId, status);
              }

              setDraggedActionId(null);
              setDropTargetStatus(null);
            }}
            data-drop-target={dropTargetStatus === status}
            className={`action-board-column bg-gradient-to-b ${columnAccentStyles[status]}`}
          >
            <div className="action-board-column-header">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">{status}</h2>
                <p className="mt-1 text-xs text-slate-500">{columnDescriptions[status]}</p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {groupedActions[status].length}
              </span>
            </div>
            <div className="action-board-column-body">
              {groupedActions[status].map((action) => (
                <article
                  key={action.id}
                  draggable={pendingActionId !== action.id}
                  onDragStart={() => setDraggedActionId(action.id)}
                  onDragEnd={() => setDraggedActionId(null)}
                  data-selected={selectedId === action.id}
                  data-overdue={isOverdue(action)}
                  data-pending={pendingActionId === action.id}
                  className="action-board-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <Link href={buildSelectionHref(action.id)} className="block text-sm font-semibold text-slate-950 hover:underline">
                        {action.title}
                      </Link>
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${priorityStyles[action.priority] ?? priorityStyles.NORMAL}`}>
                          {action.priority}
                        </span>
                        {action.projectTitle && (
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-700">
                            {action.projectTitle}
                          </span>
                        )}
                        {isOverdue(action) && (
                          <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700">
                            En retard
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Drag
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-slate-600">
                    <div className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Responsable</p>
                      <p className="mt-1 text-sm text-slate-700">{action.ownerName ?? "Non assigne"}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Echeance</p>
                      <p className="mt-1 text-sm text-slate-700">{formatDueDate(action.dueDate)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <label className="field-label">Changer le statut</label>
                      <select
                        value={action.status}
                        disabled={pendingActionId === action.id}
                        onChange={(event) => {
                          void moveAction(action.id, event.target.value as ActionStatus);
                        }}
                        className="field-select"
                      >
                        {ACTION_STATUSES.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Link href={buildSelectionHref(action.id)} className="button-secondary whitespace-nowrap px-3 py-2">
                      Ouvrir
                    </Link>
                  </div>
                </article>
              ))}
              {groupedActions[status].length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-3 py-8 text-center text-sm text-slate-500">
                  Depose une action ici ou change son statut pour remplir cette colonne.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
