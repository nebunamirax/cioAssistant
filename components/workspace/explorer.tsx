"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
import { workspacePageHierarchy, workspacePageTrail, type WorkspacePageEntry } from "@/lib/workspace/hierarchy";

type ExplorerTreeProps = {
  parentId: string | null;
  childrenByParent: Map<string | null, WorkspacePageEntry[]>;
  activePath: Set<string>;
  selectedId?: string;
  depth?: number;
};

function ExplorerTree({ parentId, childrenByParent, activePath, selectedId, depth = 0 }: ExplorerTreeProps) {
  const [expansions, setExpansions] = useState<Record<string, boolean>>({});
  const pages = childrenByParent.get(parentId);
  if (!pages?.length) return null;

  return <ul className={depth > 0 && depth <= 5 ? "ml-2 border-l border-slate-200 pl-1" : undefined}>
    {pages.map((page) => {
      const hasChildren = childrenByParent.has(page.id);
      const expanded = expansions[page.id] ?? activePath.has(page.id);
      const selected = page.id === selectedId;
      return <li key={page.id}>
        <div className={`flex min-w-0 items-start rounded-md ${selected ? "bg-indigo-50 text-indigo-800" : "text-slate-700 hover:bg-slate-50"}`}>
          {hasChildren ? <button
            type="button"
            aria-label={`${expanded ? "Replier" : "Déplier"} les sous-pages de ${page.title}`}
            aria-expanded={expanded}
            className="grid h-9 w-7 shrink-0 place-items-center rounded-md hover:bg-slate-200/60"
            onClick={() => setExpansions((previous) => ({ ...previous, [page.id]: !expanded }))}
          ><WorkspaceIcon name={expanded ? "down" : "right"} className="h-4 w-4" /></button> : <span className="w-7 shrink-0" />}
          <Link
            href={`/workspace/${page.id}`}
            aria-current={selected ? "page" : undefined}
            className={`flex min-h-9 min-w-0 flex-1 items-start gap-1.5 rounded-md py-2 pr-1.5 text-sm leading-4 ${selected ? "font-semibold" : ""}`}
          >
            <WorkspaceIcon name={hasChildren ? "folder" : "document"} className="h-4 w-4" />
            <span className="min-w-0 [overflow-wrap:anywhere]">{page.title}</span>
          </Link>
        </div>
        {hasChildren && expanded && <ExplorerTree parentId={page.id} childrenByParent={childrenByParent} activePath={activePath} selectedId={selectedId} depth={depth + 1} />}
      </li>;
    })}
  </ul>;
}

export function WorkspaceExplorer({ pages }: { pages: WorkspacePageEntry[] }) {
  const pathname = usePathname();
  const query = useSearchParams().get("query") ?? "";
  const [openedPath, setOpenedPath] = useState<string | null>(null);
  const { byId, byParent } = useMemo(() => workspacePageHierarchy(pages), [pages]);
  const selectedId = pathname.split("/")[2];
  const activePath = new Set(workspacePageTrail(byId, selectedId ?? "").map((page) => page.id));
  const mobileOpen = openedPath === pathname;

  return <aside className="overflow-hidden rounded-xl border border-slate-200 bg-white lg:sticky lg:top-20">
    <div className="space-y-3 border-b border-slate-100 p-3">
      <Link href="/workspace" className="inline-flex items-center gap-2 rounded text-sm font-semibold text-slate-900">
        <WorkspaceIcon name="document" /> Espace de travail
      </Link>
      <form action="/workspace" role="search" aria-label="Pages de l’espace de travail" className="flex gap-1.5">
        <input key={query} name="query" aria-label="Rechercher dans les pages" defaultValue={query} maxLength={250} placeholder="Rechercher…" className="field-input min-w-0" />
        <button className="workspace-icon-button shrink-0" aria-label="Lancer la recherche">
          <WorkspaceIcon name="search" />
        </button>
      </form>
    </div>
    <button type="button" aria-expanded={mobileOpen} aria-controls="workspace-page-tree"
      className="flex min-h-11 w-full items-center justify-between px-3 text-sm font-medium text-slate-700 lg:hidden"
      onClick={() => setOpenedPath(mobileOpen ? null : pathname)}>
      Arborescence des pages <WorkspaceIcon name={mobileOpen ? "down" : "right"} />
    </button>
    <nav id="workspace-page-tree" aria-label="Arborescence des pages" className={`max-h-[55dvh] overflow-y-auto p-2 lg:block lg:max-h-[calc(100dvh-12rem)] ${mobileOpen ? "block" : "hidden"}`}>
      {byParent.has(null) ? <ExplorerTree key={pathname} parentId={null} childrenByParent={byParent} activePath={activePath} selectedId={selectedId} />
        : <p className="px-2 py-3 text-sm text-slate-500">Aucune page.</p>}
    </nav>
  </aside>;
}
