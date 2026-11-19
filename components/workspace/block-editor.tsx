"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fr } from "@blocknote/core/locales";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/ariakit";
import "@blocknote/ariakit/style.css";
import { workspaceEntities, workspaceEntityLabels, workspaceStatusOptions, type WorkspaceView } from "@/lib/validation/workspace";
import { actionLabels, projectLabels, riskStatusLabels, decisionStatusLabels } from "@/lib/domain/display-labels";
import type { WorkspaceDocument } from "./page-editor";
import { workspaceBlockSchema as schema } from "@/lib/workspace/block-schema";
import { ParentPicker } from "./parent-picker";

const statusLabels: Record<string, Record<string, string>> = {
  action: actionLabels, project: projectLabels, risk: riskStatusLabels, decision: decisionStatusLabels,
  contract: { DRAFT: "Brouillon", ACTIVE: "Actif", EXPIRED: "Expiré", TERMINATED: "Résilié" }
};

export default function BlockEditor({ page, version, parent, projects }: {
  page: WorkspaceDocument; version: string;
  parent: { id: string; title: string } | null;
  projects: { id: string; title: string }[];
}) {
  const router = useRouter();
  const editor = useCreateBlockNote({ schema, dictionary: fr });
  const [title, setTitle] = useState(page.title);
  const [parentId, setParentId] = useState(page.parentId ?? "");
  const [views, setViews] = useState(page.views);
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [conflict, setConflict] = useState(false);
  const [lastRequest, setLastRequest] = useState<{ fingerprint: string; key: string }>();

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const blocks = page.contentBlocks.length ? page.contentBlocks : await editor.tryParseMarkdownToBlocks(page.contentMarkdown);
        if (!active) return;
        editor.replaceBlocks(editor.document, blocks.length ? blocks : [{ type: "paragraph" }]);
        setReady(true);
      } catch {
        if (active) setMessage("Le contenu de cette page ne peut pas être ouvert.");
      }
    })();
    return () => { active = false; };
  }, [editor, page.contentMarkdown, page.contentBlocks]);

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    const guardLink = (event: MouseEvent) => {
      if (!dirty || !(event.target instanceof Element)) return;
      const link = event.target.closest("a[href]");
      if (!link || link.hasAttribute("download") || link.getAttribute("target") === "_blank") return;
      if (!window.confirm("Des modifications sont en cours. Quitter cette page ?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", guard);
    document.addEventListener("click", guardLink, true);
    return () => {
      window.removeEventListener("beforeunload", guard);
      document.removeEventListener("click", guardLink, true);
    };
  }, [dirty]);

  function changeView(index: number, update: Partial<WorkspaceView>) {
    setViews((items) => items.map((item, position) => position === index ? { ...item, ...update } : item));
    setDirty(true);
  }

  return <form className="workspace-document space-y-5" onSubmit={async (event) => {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const fields = { title, parentId: parentId || null, contentBlocks: editor.document, views };
      const fingerprint = JSON.stringify(fields);
      const key = lastRequest?.fingerprint === fingerprint ? lastRequest.key : crypto.randomUUID();
      setLastRequest({ fingerprint, key });
      const response = await fetch(`/api/workspace/pages/${page.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, expectedVersion: version, fields })
      });
      const result = await response.json();
      if (!response.ok) {
        setConflict(response.status === 409);
        throw new Error(result.error || "Enregistrement impossible.");
      }
      setDirty(false);
      setMessage("Page enregistrée.");
      router.refresh();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Enregistrement impossible.");
    } finally {
      setPending(false);
    }
  }}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <label className="min-w-0 flex-1">
        <span className="sr-only">Titre de la page</span>
        <input required maxLength={250} className="workspace-document-title" value={title} onChange={(event) => { setTitle(event.target.value); setDirty(true); }} />
      </label>
      <button className="button-primary" disabled={!ready || pending || !dirty || conflict}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
    </div>
    {message && <p role={conflict ? "alert" : "status"} className={conflict ? "text-sm text-rose-700" : "text-sm text-slate-600"}>{message}</p>}
    {conflict && <div className="flex flex-wrap gap-3">
      <button type="button" className="button-secondary" onClick={async () => {
        const text = await editor.blocksToMarkdownLossy(editor.document);
        const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "brouillon.md";
        link.click();
        URL.revokeObjectURL(url);
      }}>Télécharger mon brouillon</button>
      <button type="button" className="button-secondary" onClick={() => window.location.reload()}>Charger la version enregistrée</button>
    </div>}
    <div className="workspace-document-body" aria-label="Contenu de la page">
      <BlockNoteView className="workspace-block-editor" editor={editor} theme="light" editable={ready && !pending && !conflict} onChange={() => { if (ready) setDirty(true); }} />
    </div>
    <details className="rounded-xl border border-slate-200 p-4">
      <summary className="cursor-pointer text-sm font-medium">Organiser la page</summary>
      <ParentPicker id={page.id} parent={parent} value={parentId} onChange={(id) => { setParentId(id); setDirty(true); }} />
      {parent && <Link href={`/workspace/${parent.id}`} className="mt-2 inline-block text-sm text-blue-700">Page parente · {parent.title}</Link>}
    </details>
    <details className="rounded-xl border border-slate-200 p-4">
      <summary className="cursor-pointer text-sm font-medium">Configurer les vues de suivi</summary>
      <div className="mt-4 space-y-4">
        {views.map((view, index) => <div key={view.id} className="grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
          <label className="field-label">Nom de la vue<input className="field-input mt-1" required maxLength={120} value={view.title} onChange={(event) => changeView(index, { title: event.target.value })} /></label>
          <label className="field-label">Fiches<select className="field-select mt-1" value={view.entity} onChange={(event) => changeView(index, { entity: event.target.value as WorkspaceView["entity"], status: "", projectId: null, layout: "table" })}>
            {workspaceEntities.map((entity) => <option key={entity} value={entity}>{workspaceEntityLabels[entity]}</option>)}
          </select></label>
          <label className="field-label">Affichage<select className="field-select mt-1" value={view.layout} onChange={(event) => changeView(index, { layout: event.target.value as WorkspaceView["layout"] })}>
            <option value="table">Tableau</option>
            {!["budget", "meeting", "service"].includes(view.entity) && <option value="kanban">Kanban</option>}
          </select></label>
          {view.entity !== "service" && <label className="field-label">Projet<select className="field-select mt-1" value={view.projectId ?? ""} onChange={(event) => changeView(index, { projectId: event.target.value || null })}>
            <option value="">Tous les projets</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
          </select></label>}
          <label className="field-label">Recherche dans les fiches<input className="field-input mt-1" value={view.query} maxLength={250} onChange={(event) => changeView(index, { query: event.target.value })} /></label>
          {workspaceStatusOptions[view.entity].length > 0 && <label className="field-label">Statut<select className="field-select mt-1" value={view.status} onChange={(event) => changeView(index, { status: event.target.value })}>
            <option value="">Tous les statuts</option>
            {workspaceStatusOptions[view.entity].map((status) => <option key={status} value={status}>{statusLabels[view.entity]?.[status] ?? status}</option>)}
          </select></label>}
          <button type="button" className="button-secondary self-end" onClick={() => { setViews((items) => items.filter((_, position) => position !== index)); setDirty(true); }}>Retirer cette vue</button>
        </div>)}
        <button type="button" disabled={views.length >= 8} className="button-secondary" onClick={() => {
          setViews((items) => [...items, { id: crypto.randomUUID(), title: "Actions", entity: "action", layout: "table", projectId: null, status: "", query: "" }]);
          setDirty(true);
        }}>Ajouter une vue</button>
        <p className="text-xs text-slate-500">Les vues sont actualisées après l’enregistrement de la page.</p>
      </div>
    </details>
  </form>;
}
