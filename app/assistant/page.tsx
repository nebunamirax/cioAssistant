import Link from "next/link";
import { AssistantChat } from "@/components/assistant/assistant-chat";
import { PmoIntakePanel } from "@/components/assistant/pmo-intake-panel";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
import { requireMember } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { countPendingAIIntakeReviews } from "@/lib/services/ai-intake-review-service";

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ view?: string; project?: string }> }) {
  await requireMember("DSI");
  const params = await searchParams;
  const chat = params.view === "chat";
  const context = typeof params.project === "string" ? params.project : "";
  const [projects, reviewCount] = await Promise.all([
    chat ? [] : prisma.project.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
    countPendingAIIntakeReviews()
  ]);
  const initialProject = projects.find((project) => project.id === context)?.id ?? "";
  const projectQuery = context ? `project=${encodeURIComponent(context)}` : "";

  return (
    <div className="workspace-page">
      <header className="workspace-page-heading">
        <div>
          <h1 className="workspace-page-title">Assistant</h1>
          <p className="mt-2 text-sm text-slate-600">{chat ? "Formulez une demande ou joignez un document à traiter." : "Transformez vos comptes rendus en mises à jour du portefeuille."}</p>
        </div>
        <Link href={reviewCount ? "/ai-reviews?status=PENDING" : "/ai-reviews"} className="button-secondary gap-2">
          <WorkspaceIcon name="check" className="h-4 w-4" /> Suggestions à valider{reviewCount > 0 ? ` (${reviewCount})` : ""}
        </Link>
      </header>
      <nav className="workspace-tabs" aria-label="Modes de l’assistant">
        <Link href={projectQuery ? `/assistant?${projectQuery}` : "/assistant"} aria-current={!chat ? "page" : undefined}><WorkspaceIcon name="document" /> Compte rendu</Link>
        <Link href={`/assistant?view=chat${projectQuery ? `&${projectQuery}` : ""}`} aria-current={chat ? "page" : undefined}><WorkspaceIcon name="sparkles" /> Chat et documents</Link>
      </nav>
      {chat ? <AssistantChat /> : <PmoIntakePanel key={initialProject} projects={projects} initialProject={initialProject} />}
    </div>
  );
}
