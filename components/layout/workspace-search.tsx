"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { WorkspaceIcon, type WorkspaceIconName } from "@/components/ui/workspace-icon";
import { primaryLinks, settingsLink, suggestionsLink, toolLinks, workspaceLinks } from "./workspace-navigation";

const resultIcons = {
  project: "folder",
  action: "check",
  page: "document",
  decision: "decision",
  risk: "alert"
} satisfies Record<string, WorkspaceIconName>;

type SearchResult = { title: string; detail: string; kind: keyof typeof resultIcons; href: string };

function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("fr");
}

export function WorkspaceSearch({ role }: { role: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [lookup, setLookup] = useState<{ query: string; results: SearchResult[]; error?: string } | null>(null);
  const value = query.trim();
  const shortcuts = workspaceLinks([
    { label: "Nouvelle action", href: "/actions?new=1", icon: "plus", shared: true },
    { label: "Nouveau projet", href: "/projects?new=1", icon: "plus" },
    ...primaryLinks,
    ...toolLinks,
    suggestionsLink,
    settingsLink
  ], role);
  const matches = value ? shortcuts.filter((link) => normalize(link.label).includes(normalize(value))).slice(0, 5) : shortcuts.slice(0, 4);
  const currentLookup = lookup?.query === value ? lookup : null;
  const results = [
    ...matches.map((link) => ({ ...link, title: link.label, detail: "Navigation" })),
    ...(currentLookup?.results ?? []).map((item) => ({ ...item, icon: resultIcons[item.kind] }))
  ];

  function show() {
    dialog.current?.showModal();
    setOpen(true);
    input.current?.focus();
  }

  function go(href: string) {
    dialog.current?.close();
    router.push(href);
  }

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((!event.metaKey && !event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      if (document.querySelector("dialog[open]") && !dialog.current?.open) return;
      event.preventDefault();
      if (dialog.current?.open) dialog.current.close();
      else show();
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (!open || value.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/workspace/search?q=${encodeURIComponent(value)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Recherche indisponible.");
        const { data } = await response.json() as { data: SearchResult[] };
        if (!controller.signal.aborted) setLookup({ query: value, results: data });
      } catch {
        if (!controller.signal.aborted) setLookup({ query: value, results: [], error: "Recherche momentanément indisponible." });
      }
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, value]);

  return (
    <>
      <button type="button" className="workspace-search-trigger" aria-label="Ouvrir la recherche globale" aria-haspopup="dialog" onClick={show}>
        <WorkspaceIcon name="search" />
        <span className="hidden sm:inline">Rechercher…</span>
        <kbd className="workspace-key hidden md:inline">⌘ K</kbd>
      </button>
      <dialog
        ref={dialog}
        className="workspace-search-dialog print:hidden"
        aria-label="Recherche"
        onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}
        onClose={() => { setOpen(false); setQuery(""); setActive(0); setLookup(null); }}
      >
        <form className="workspace-search-input" onSubmit={(event) => {
          event.preventDefault();
          if (results[active]) go(results[active].href);
        }}>
          <WorkspaceIcon name="search" />
          <input
            ref={input}
            type="text"
            maxLength={120}
            placeholder="Rechercher dans l’espace de travail…"
            aria-label="Rechercher dans l’espace de travail"
            aria-controls="workspace-search-results"
            aria-expanded={open}
            role="combobox"
            aria-autocomplete="list"
            aria-activedescendant={results[active] ? `workspace-result-${active}` : undefined}
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActive(0); }}
            onKeyDown={(event) => {
              if (!results.length || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) return;
              event.preventDefault();
              const next = (active + (event.key === "ArrowDown" ? 1 : -1) + results.length) % results.length;
              setActive(next);
              document.getElementById(`workspace-result-${next}`)?.scrollIntoView({ block: "nearest" });
            }}
          />
          <button type="button" className="workspace-icon-button" aria-label="Fermer la recherche" onClick={() => dialog.current?.close()}><WorkspaceIcon name="close" /></button>
        </form>
        <div className="workspace-search-body">
          <div role="listbox" id="workspace-search-results" aria-label="Résultats de recherche">
            {results.map((result, index) => (
              <button type="button" key={result.href} id={`workspace-result-${index}`} role="option" aria-selected={active === index} tabIndex={-1} className="workspace-search-result" onMouseEnter={() => setActive(index)} onClick={() => go(result.href)}>
                <WorkspaceIcon name={result.icon} />
                <span className="min-w-0 flex-1 truncate text-left font-semibold">{result.title}</span>
                <span className="hidden max-w-[37%] truncate text-xs text-slate-500 sm:block">{result.detail}</span>
                <WorkspaceIcon name="right" className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
          {value.length >= 2 && !currentLookup && <p className="workspace-search-message" role="status">Recherche en cours…</p>}
          {currentLookup?.error && <p className="workspace-search-message" role="alert">{currentLookup.error}</p>}
          {!results.length && currentLookup && !currentLookup.error && <p className="workspace-search-message" role="status">Aucun résultat pour « {value} ».</p>}
          {!results.length && value.length === 1 && <p className="workspace-search-message">Saisissez au moins deux caractères.</p>}
        </div>
      </dialog>
    </>
  );
}
