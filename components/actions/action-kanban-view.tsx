"use client";

import { actionLabels, priorityLabels } from "@/lib/domain/display-labels";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
  now: number;
};

const priorityStyles: Record<string, string> = {
  LOW: "border-emerald-200 bg-emerald-50 text-emerald-700",
  NORMAL: "border-slate-200 bg-slate-100 text-slate-700",
  HIGH: "border-amber-200 bg-amber-50 text-amber-700",
  CRITICAL: "border-rose-200 bg-rose-50 text-rose-700"
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
    return "Sans échéance";
  }

  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "Europe/Paris" }).format(new Date(value));
}

function isOverdue(action: ActionKanbanItem, now: number) {
  if (!action.dueDate || action.status === "DONE") {
    return false;
  }

  return Date.parse(action.dueDate) < now;
}

export function ActionKanbanView({ actions, selectedId, baseSearchParams, now }: ActionKanbanViewProps) {
  const router = useRouter();
  const board = useRef<HTMLDivElement>(null);
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

    if (pendingActionId || !currentAction || currentAction.status === nextStatus) {
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
    }).catch(() => null);

    if (!response?.ok) {
      const payload = await response?.json().catch(() => null);
      setItems(previousItems);
      setError(payload?.error ?? "Impossible de déplacer l’action.");
      setPendingActionId(null);
      return;
    }

    setPendingActionId(null);
    router.refresh();
  };

  return (
    <section className="space-y-3">
      {error && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      <div role="group" aria-label="Aller à un statut" className="flex flex-wrap gap-1.5 lg:hidden">
        {ACTION_STATUSES.map((status) => (
          <button type="button" className="workspace-segment-link border border-slate-200 bg-white"
            key={status} onClick={() => board.current?.querySelector<HTMLElement>(`[data-column="${status}"]`)?.focus()}>
            {actionLabels[status]} ({groupedActions[status].length})
          </button>
        ))}
      </div>
      <div ref={board} className="action-board-shell" tabIndex={0} role="region" aria-label="Kanban des actions">
        {ACTION_STATUSES.map((status) => (
          <div
            key={status}
            data-column={status}
            tabIndex={-1}
            onFocus={(event) => {
              if (event.target === event.currentTarget) event.currentTarget.scrollIntoView({ block: "nearest", inline: "start" });
            }}
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
                <h2 className="text-sm font-semibold text-slate-950">{actionLabels[status]}</h2>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {groupedActions[status].length}
              </span>
            </div>
            <div className="action-board-column-body">
              {groupedActions[status].map((action) => (
                <article
                  key={action.id}
                  id={`action-${action.id}`}
                  draggable={pendingActionId === null}
                  onDragStart={() => setDraggedActionId(action.id)}
                  onDragEnd={() => setDraggedActionId(null)}
                  data-selected={selectedId === action.id}
                  data-overdue={isOverdue(action, now)}
                  data-pending={pendingActionId === action.id}
                  className="action-board-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <Link href={buildSelectionHref(action.id) + "#action-detail"} className="block text-sm font-semibold text-slate-950 hover:underline">
                        {action.title}
                      </Link>
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${priorityStyles[action.priority] ?? priorityStyles.NORMAL}`}>
                          {priorityLabels[action.priority] ?? action.priority}
                        </span>
                        {action.projectTitle && (
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-700">
                            {action.projectTitle}
                          </span>
                        )}
                        {isOverdue(action, now) && (
                          <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700">
                            En retard
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    <p>{action.ownerName ?? "Sans responsable"}</p>
                    <p>{formatDueDate(action.dueDate)}</p>
                  </div>
                  <div className="mt-3">
                    <label className="field-label" htmlFor={`status-${action.id}`}>Statut</label>
                    <select
                      id={`status-${action.id}`}
                      value={action.status}
                      disabled={pendingActionId !== null}
                      onChange={(event) => void moveAction(action.id, event.target.value as ActionStatus)}
                      className="field-select"
                    >
                      {ACTION_STATUSES.map((value) => (
                        <option key={value} value={value}>{actionLabels[value]}</option>
                      ))}
                    </select>
                  </div>
                </article>
              ))}
              {groupedActions[status].length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-3 py-8 text-center text-sm text-slate-500">
                  Aucune action
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
