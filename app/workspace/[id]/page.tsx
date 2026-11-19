import Link from "next/link";
import { notFound } from "next/navigation";
import { digest, requireMember } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { canonical } from "@/lib/business/canonical";
import { pageViews } from "@/lib/services/workspace-service";
import { workspacePageIndex } from "@/lib/services/workspace-navigation";
import { workspacePageTrail } from "@/lib/workspace/hierarchy";
import { WorkspacePageEditor } from "@/components/workspace/page-editor";
import { NewWorkspacePage } from "@/components/workspace/new-page";
import { LiveWorkspaceView } from "@/components/workspace/live-view";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";

export const dynamic = "force-dynamic";

export default async function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  await requireMember("DSI");
  const { id } = await params;
  const page = await prisma.workspacePage.findUnique({ where: { id } });
  if (!page) notFound();
  const [pages, revisions, projects] = await Promise.all([
    workspacePageIndex(),
    prisma.workspaceRevision.findMany({ where: { pageId: id }, orderBy: { revision: "desc" }, take: 20, select: { revision: true, authorName: true, createdAt: true } }),
    prisma.project.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } })
  ]);
  const ancestors = workspacePageTrail(new Map(pages.map((entry) => [entry.id, entry])), id).slice(0, -1);
  const views = pageViews(page);
  return <div className="workspace-page">
    <nav aria-label="Fil d’Ariane">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
        <li><Link href="/workspace" className="workspace-panel-link">Documentation</Link></li>
        {ancestors.map((ancestor) => <li key={ancestor.id} className="flex min-w-0 items-center gap-2">
          <WorkspaceIcon name="right" className="h-3.5 w-3.5 text-slate-400" />
          <Link href={`/workspace/${ancestor.id}`} className="workspace-panel-link min-w-0 [overflow-wrap:anywhere]">{ancestor.title}</Link>
        </li>)}
        <li aria-current="page" className="flex min-w-0 items-center gap-2">
          <WorkspaceIcon name="right" className="h-3.5 w-3.5 text-slate-400" /><span className="[overflow-wrap:anywhere]">{page.title}</span>
        </li>
      </ol>
    </nav>
    <WorkspacePageEditor page={{ id, title: page.title, parentId: page.parentId, contentMarkdown: page.contentMarkdown, contentBlocks: JSON.parse(page.blocksJson), views }} version={digest(canonical(page))} parent={ancestors.at(-1) ?? null} projects={projects} />
    {views.map((view) => <LiveWorkspaceView key={view.id} pageId={id} view={view} />)}
    <div className="grid items-start gap-4 sm:grid-cols-2">
      <NewWorkspacePage parentId={id} />
      <details className="workbench-panel">
        <summary className="panel-title cursor-pointer">Historique des versions</summary>
        <p className="mt-2 text-xs text-slate-500">Téléchargez une révision en Markdown.</p>
        <ul className="mt-3 space-y-3 text-sm">{revisions.map((revision) => <li key={revision.revision}>
          <a className="text-blue-800" href={`/api/workspace/pages/${id}/export?revision=${revision.revision}`} download>Version {revision.revision}</a>
          <p className="text-xs text-slate-500">{revision.authorName} · {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" }).format(revision.createdAt)}</p>
        </li>)}</ul>
      </details>
    </div>
  </div>;
}
