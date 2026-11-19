import Link from "next/link";
import { requireMember } from "@/lib/auth/session";
import { listWorkspacePages } from "@/lib/services/workspace-service";
import { workspaceListFields } from "@/lib/validation/workspace";
import { NewWorkspacePage } from "@/components/workspace/new-page";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";

export const dynamic = "force-dynamic";

export default async function Workspace({ searchParams }: { searchParams: Promise<{ query?: string; cursor?: string }> }) {
  await requireMember("DSI");
  const { query: rawQuery, cursor: rawCursor } = await searchParams;
  const input = workspaceListFields.safeParse({ query: rawQuery, cursor: rawCursor });
  const filters = input.success ? input.data : workspaceListFields.parse({});
  const { query } = filters;
  const result = await listWorkspacePages({ ...filters, parentId: query ? undefined : null });
  return <div className="workspace-page">
    <header className="workspace-page-heading">
      <div><h1 className="workspace-page-title">{query ? "Résultats de recherche" : "Espace de travail"}</h1>
        <p className="mt-2 break-words text-sm text-slate-600">{query ? `Pages correspondant à « ${query} »` : "Retrouvez vos procédures, vos notes et vos vues de suivi."}</p>
      </div>
      {query && <Link className="workspace-panel-link" href="/workspace">Effacer la recherche</Link>}
    </header>
    <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_280px]">
      <section className="workbench-panel space-y-5">
        {!query && <h2 className="panel-title">Pages principales</h2>}
        {result.items.length ? <ul className="divide-y divide-slate-100">
          {result.items.map((page) => <li key={page.id}><Link href={`/workspace/${page.id}`} className="group flex items-center gap-3 rounded-md px-2 py-3 hover:bg-slate-50">
            <WorkspaceIcon name="document" className="h-5 w-5 text-indigo-600" />
            <span className="min-w-0 flex-1">
              <span className="block break-words font-medium text-slate-900 group-hover:text-indigo-800">{page.title}</span>
              <span className="block text-xs text-slate-500">{page.editedByName} · v{page.revision}</span>
            </span>
            <WorkspaceIcon name="right" className="h-4 w-4 text-slate-500" />
          </Link></li>)}
        </ul> : <p className="py-3 text-sm text-slate-600">{query ? "Aucune page trouvée." : "Créez une page pour rassembler vos notes et votre suivi."}</p>}
        {result.nextCursor && <Link className="button-secondary" href={`/workspace?${new URLSearchParams({ query, cursor: result.nextCursor })}`}>Pages suivantes</Link>}
      </section>
      {!query && <NewWorkspacePage />}
    </div>
  </div>;
}
