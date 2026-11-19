"use client";

import dynamic from "next/dynamic";

const Editor = dynamic(() => import("./block-editor"), {
  ssr: false, loading: () => <p className="p-6 text-sm text-slate-500">Ouverture de la page…</p>
});

export type WorkspaceDocument = {
  id: string; title: string; parentId: string | null; contentMarkdown: string; contentBlocks: import("@/lib/workspace/block-schema").WorkspaceBlock[];
  views: import("@/lib/validation/workspace").WorkspaceView[];
};

export function WorkspacePageEditor(props: {
  page: WorkspaceDocument; version: string;
  parent: { id: string; title: string } | null;
  projects: { id: string; title: string }[];
}) {
  return <Editor key={props.page.id + props.version} {...props} />;
}
