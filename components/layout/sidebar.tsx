"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, type ReactNode } from "react";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
import { primaryLinks, settingsLink, suggestionsLink, toolLinks, workspaceLinks } from "./workspace-navigation";
import { WorkspaceSearch } from "./workspace-search";

function isCurrent(path: string, href: string) {
  return path === href || (href !== "/" && path.startsWith(`${href}/`));
}

export function WorkspaceShell({ role, name, children }: { role: string; name: string; children: ReactNode }) {
  const path = usePathname();
  const drawer = useRef<HTMLDialogElement>(null);
  const home = role === "DSI" ? "/" : "/actions";
  const mainLinks = workspaceLinks(primaryLinks, role);
  const tools = workspaceLinks(toolLinks, role);
  const current = [...mainLinks, ...tools, settingsLink, suggestionsLink].find((link) => isCurrent(path, link.href));
  const activeTool = tools.some((link) => isCurrent(path, link.href));
  const initials = name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("");

  function navLink(link: (typeof mainLinks)[number]) {
    const active = isCurrent(path, link.href) || (link.href === "/assistant" && path === "/ai-reviews");
    return (
      <Link key={link.href} href={link.href} className="workspace-nav-link" aria-current={active ? "page" : undefined}>
        <WorkspaceIcon name={link.icon} />
        <span>{link.label}</span>
      </Link>
    );
  }

  function navigation() {
    return (
      <>
        <Link href={home} className="workspace-brand">
          <span className="pilot-brand-mark"><WorkspaceIcon name="mark" className="h-5 w-5" /></span>
          <span>Pilotage DSI</span>
        </Link>
        <nav aria-label="Navigation principale" className="workspace-navigation">
          <div className="workspace-nav-group">{mainLinks.map(navLink)}</div>
          {tools.length === 1 ? (
            <div className="workspace-nav-tools">{tools.map(navLink)}</div>
          ) : (
            <details key={String(activeTool)} open={activeTool || undefined} className="workspace-nav-tools">
              <summary className="workspace-nav-link workspace-tools-toggle">
                <WorkspaceIcon name="more" />
                <span className="flex-1">Autres outils</span>
                <WorkspaceIcon name="down" className="workspace-disclosure h-3.5 w-3.5" />
              </summary>
              <div className="mt-1 space-y-0.5 pl-2">{tools.map(navLink)}</div>
            </details>
          )}
        </nav>
        <div className="workspace-footer">
          {role === "DSI" && navLink(settingsLink)}
          <form action="/api/auth/logout" method="post" className="workspace-account">
            <span className="workspace-avatar" aria-hidden="true">{initials}</span>
            <span className="min-w-0 flex-1 truncate font-semibold" title={name}>{name}</span>
            <button className="workspace-icon-button" type="submit" aria-label="Déconnexion" title="Déconnexion">
              <WorkspaceIcon name="logout" />
            </button>
          </form>
        </div>
      </>
    );
  }

  return (
    <div className="workspace-frame">
      <a href="#main" className="skip-link">Aller au contenu</a>
      <aside className="workspace-sidebar hidden lg:flex print:hidden">{navigation()}</aside>
      <div className="min-w-0 flex-1">
        <header className="workspace-topbar print:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            <button type="button" className="workspace-icon-button lg:hidden" aria-label="Ouvrir le menu" aria-haspopup="dialog" onClick={() => drawer.current?.showModal()}>
              <WorkspaceIcon name="menu" />
            </button>
            {current && <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden text-slate-500 sm:inline">Pilotage DSI</span>
              <WorkspaceIcon name="right" className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
              <span className="truncate font-semibold text-slate-800">{current.label}</span>
            </div>}
          </div>
          <WorkspaceSearch role={role} />
        </header>
        <main id="main" tabIndex={-1} className="workspace-main">{children}</main>
      </div>
      <dialog ref={drawer} className="workspace-drawer lg:hidden print:hidden" aria-label="Menu principal" onClick={(event) => {
        if (event.target === event.currentTarget || (event.target instanceof Element && event.target.closest("a[href]"))) {
          event.currentTarget.close();
        }
      }}>
        <div className="workspace-sidebar">
          <form method="dialog" className="absolute right-2 top-4">
            <button className="workspace-icon-button" aria-label="Fermer le menu"><WorkspaceIcon name="close" /></button>
          </form>
          {navigation()}
        </div>
      </dialog>
    </div>
  );
}
