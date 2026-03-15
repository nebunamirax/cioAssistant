import Link from "next/link";
import { ActionForm } from "@/components/actions/action-form";
import { ActionFilters } from "@/components/actions/action-filters";
import { ACTION_STATUSES, PRIORITIES } from "@/lib/domain/constants";
import { listActions } from "@/lib/services/action-service";
import type { ActionFilters as ActionFiltersInput } from "@/lib/validation/action";

type ActionsPageProps = {
  searchParams?: {
    search?: string;
    status?: string;
    priority?: string;
    overdueOnly?: string;
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

export default async function ActionsPage({ searchParams }: ActionsPageProps) {
  const status: ActionFiltersInput["status"] = searchParams?.status && isActionStatus(searchParams.status)
    ? searchParams.status
    : undefined;
  const priority: ActionFiltersInput["priority"] = searchParams?.priority && isPriority(searchParams.priority)
    ? searchParams.priority
    : undefined;
  const filters: ActionFiltersInput = {
    search: searchParams?.search,
    status,
    priority,
    overdueOnly: searchParams?.overdueOnly === "true"
  };
  const actions = await listActions(filters);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Actions</h1>
      <ActionFilters values={filters} />
      <ActionForm />
      <div className="rounded-lg border border-slate-200 bg-white">
        <table className="w-full table-auto text-sm">
          <thead className="bg-slate-100 text-left text-slate-700">
            <tr>
              <th className="p-3">Titre</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Priorité</th>
              <th className="p-3">Projet</th>
              <th className="p-3">Échéance</th>
              <th className="p-3">Modifier</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((action) => (
              <tr key={action.id} className="border-t border-slate-100">
                <td className="p-3">
                  <Link href={`/actions/${action.id}`} className="font-medium text-slate-900 hover:underline">
                    {action.title}
                  </Link>
                </td>
                <td className="p-3">{action.status}</td>
                <td className="p-3">{action.priority}</td>
                <td className="p-3">{action.project?.title ?? "—"}</td>
                <td className="p-3">{action.dueDate ? new Intl.DateTimeFormat("fr-FR").format(action.dueDate) : "—"}</td>
                <td className="p-3">
                  <Link href={`/actions/${action.id}`} className="text-slate-900 hover:underline">
                    Modifier
                  </Link>
                </td>
              </tr>
            ))}
            {actions.length === 0 && (
              <tr>
                <td colSpan={6} className="p-3 text-slate-500">
                  Aucune action.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
