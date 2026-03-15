import { ActionForm } from "@/components/actions/action-form";
import { listActions } from "@/lib/services/action-service";

export default async function ActionsPage() {
  const actions = await listActions();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Actions</h1>
      <ActionForm />
      <div className="rounded-lg border border-slate-200 bg-white">
        <table className="w-full table-auto text-sm">
          <thead className="bg-slate-100 text-left text-slate-700">
            <tr>
              <th className="p-3">Titre</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Priorité</th>
              <th className="p-3">Projet</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((action) => (
              <tr key={action.id} className="border-t border-slate-100">
                <td className="p-3">{action.title}</td>
                <td className="p-3">{action.status}</td>
                <td className="p-3">{action.priority}</td>
                <td className="p-3">{action.project?.title ?? "—"}</td>
              </tr>
            ))}
            {actions.length === 0 && (
              <tr>
                <td colSpan={4} className="p-3 text-slate-500">
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
