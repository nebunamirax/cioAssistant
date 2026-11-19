import type { ReactNode } from "react";
import { WorkspaceExplorer } from "@/components/workspace/explorer";
import { requireMember } from "@/lib/auth/session";
import { workspacePageIndex } from "@/lib/services/workspace-navigation";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  await requireMember("DSI");
  const pages = await workspacePageIndex();

  return <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
    <WorkspaceExplorer pages={pages} />
    <div className="min-w-0">{children}</div>
  </div>;
}
