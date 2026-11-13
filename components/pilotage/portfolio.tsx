import Link from "next/link";
import { pilotageDate, projectLabels, type getPortfolio } from "@/lib/services/pilotage-service";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";

export function Portfolio({ projects }: { projects: Awaited<ReturnType<typeof getPortfolio>> }) {
  if (!projects.length) return <p className="workspace-empty">Aucun projet en cours.</p>;

  return (
    <ul className="workspace-feed">
      {projects.map((project) => (
        <li key={project.id}>
          <Link href={`/projects/${encodeURIComponent(project.id)}`} className="workspace-feed-row">
            <span className="workspace-feed-icon" data-tone="blue"><WorkspaceIcon name="folder" className="h-4 w-4" /></span>
            <span className="workspace-feed-text">
              <strong>{project.title}</strong>
              <span>{[project.owner?.name ?? "Responsable à attribuer", project.targetDate && pilotageDate(project.targetDate)].filter(Boolean).join(" · ")}</span>
            </span>
            <span className="workspace-feed-meta">
              {project.blocked
                ? <span className="pilot-status" data-status="BLOCKED">Action bloquée</span>
                : <span className="pilot-status" data-status={project.status}>{projectLabels[project.status] ?? project.status}</span>}
              {project.total > 0 && (
                <span className="flex items-center gap-1.5 text-xs tabular-nums" title={`${project.completed} actions terminées sur ${project.total}`}>
                  <progress className="pilot-progress hidden sm:inline-block" value={project.completed} max={project.total} aria-label={`Actions terminées pour ${project.title}`} />
                  {project.completed}/{project.total}
                </span>
              )}
            </span>
            <WorkspaceIcon name="right" className="workspace-feed-arrow h-4 w-4" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
