import Link from "next/link";
import { publicUrl } from "@/lib/auth/session";
import { PlannerControls } from "@/components/integrations/planner-controls";
import { TicketCsvImport } from "@/components/integrations/ticket-csv-import";
import { prisma } from "@/lib/db/prisma";
import { plannerCallbackUrl, plannerConnection } from "@/lib/integrations/planner";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage({ searchParams: searchParamsPromise }: {
  searchParams?: Promise<{ projectId?: string; serviceId?: string; planner?: string; plannerError?: string }>;
}) {
  const searchParams = await searchParamsPromise;
  const [projects, linked, connection, services] = await Promise.all([
    prisma.project.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
    prisma.externalSource.findMany({
      where: { kind: "PLANNER" },
      select: { key: true, title: true, projectId: true, lastSyncedAt: true },
      orderBy: { title: "asc" }
    }),
    plannerConnection(),
    prisma.supportService.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } })
  ]);
  const initialProjectId = projects.find((project) => project.id === searchParams?.projectId)?.id ?? "";

  return (
    <div className="space-y-4">
      <header className="workbench-header">
        <div><h1 className="text-2xl font-semibold">Intégrations</h1><p className="mt-1 text-sm text-slate-600">Rattache les tâches Planner et les tickets aux projets DSI.</p></div>
        <div className="flex gap-2"><Link href="/settings/integrations/claude" className="button-primary">Claude</Link><Link href="/settings" className="button-secondary">Paramètres généraux</Link></div>
      </header>
      {searchParams?.planner === "connected" && <p role="status" className="workbench-panel text-sm text-emerald-800">Compte Planner connecté.</p>}
      {searchParams?.plannerError && <p role="alert" className="workbench-panel text-sm text-rose-700">{searchParams.plannerError}</p>}
      {projects.length === 0 && <p className="workbench-panel text-sm text-slate-600"><Link href="/projects" className="pilot-row-link">Crée un projet</Link> pour y rattacher une source.</p>}
      <PlannerControls {...connection} callbackUrl={plannerCallbackUrl(publicUrl().origin)} projects={projects} initialProjectId={initialProjectId}
        linked={linked.filter((plan) => plan.projectId !== null).map((plan) => ({ ...plan, projectId: plan.projectId!, lastSyncedAt: plan.lastSyncedAt?.toISOString() ?? null }))} />
      {(projects.length > 0 || services.length > 0) && <TicketCsvImport projects={projects} services={services} initialProjectId={initialProjectId} initialServiceId={searchParams?.serviceId} />}
    </div>
  );
}
