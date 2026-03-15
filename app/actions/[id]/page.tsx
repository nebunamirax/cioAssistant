import Link from "next/link";
import { ActionDeleteButton } from "@/components/actions/action-delete-button";
import { ActionForm } from "@/components/actions/action-form";
import { ACTION_STATUSES, PRIORITIES } from "@/lib/domain/constants";
import { getActionById } from "@/lib/services/action-service";
import { notFound } from "next/navigation";

export default async function ActionDetailPage({ params }: { params: { id: string } }) {
  const action = await getActionById(params.id);

  if (!action) return notFound();

  const status = ACTION_STATUSES.includes(action.status as (typeof ACTION_STATUSES)[number])
    ? (action.status as (typeof ACTION_STATUSES)[number])
    : "TODO";
  const priority = PRIORITIES.includes(action.priority as (typeof PRIORITIES)[number])
    ? (action.priority as (typeof PRIORITIES)[number])
    : "NORMAL";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/actions" className="text-sm text-slate-600 hover:underline">
            Retour aux actions
          </Link>
          <h1 className="text-2xl font-semibold">{action.title}</h1>
        </div>
        <ActionDeleteButton actionId={action.id} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr),minmax(280px,1fr)]">
        <ActionForm
          mode="edit"
          actionId={action.id}
          initialValues={{
            title: action.title,
            description: action.description ?? "",
            status,
            priority,
            dueDate: action.dueDate ? new Date(action.dueDate).toISOString().slice(0, 16) : ""
          }}
        />
        <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <h2 className="font-semibold text-slate-900">Contexte</h2>
          <p><strong>Projet:</strong> {action.project?.title ?? "—"}</p>
          <p><strong>Fournisseur:</strong> {action.vendor?.name ?? "—"}</p>
          <p><strong>Contrat:</strong> {action.contract?.title ?? "—"}</p>
          <p><strong>Créée le:</strong> {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(action.createdAt)}</p>
          <p><strong>Terminée le:</strong> {action.completedAt ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(action.completedAt) : "—"}</p>
        </section>
      </div>
    </div>
  );
}
