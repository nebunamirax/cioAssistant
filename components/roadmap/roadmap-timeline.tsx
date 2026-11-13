import Link from "next/link";
import { type CSSProperties } from "react";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
import { pilotageDate } from "@/lib/services/pilotage-service";
import { getRoadmapPosition } from "@/lib/services/roadmap-service";

const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit", timeZone: "UTC" });

export type TimelineRow = {
  id: string;
  title: string;
  href: string;
  kind: "project" | "milestone" | "action";
  status: string;
  statusLabel: string;
  startDate?: Date | null;
  targetDate: Date | null;
  meta?: string;
  milestones?: { id: string; title: string; dueDate: Date | null }[];
};

export function RoadmapTimeline({ months, rows, today, label }: { months: Date[]; rows: TimelineRow[]; today: Date; label: string }) {
  const todayPosition = getRoadmapPosition({ targetDate: today, months });
  const style = {
    "--roadmap-months": months.length,
    "--roadmap-today": todayPosition ? `${todayPosition.left}%` : undefined
  } as CSSProperties;

  return (
    <div className="roadmap-scroll" tabIndex={0} role="region" aria-label={label}>
      <table className="roadmap-table" style={style}>
        <thead>
          <tr>
            <th scope="col" className="roadmap-project">{rows[0]?.kind === "project" ? "Projet" : "Jalon ou action"}</th>
            {months.map((month) => (
              <th scope="col" key={month.toISOString()} data-current={month.getUTCMonth() === today.getUTCMonth() && month.getUTCFullYear() === today.getUTCFullYear()}>
                {monthLabel.format(month)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const position = getRoadmapPosition({ startDate: row.startDate, targetDate: row.targetDate, months });
            const dateLabel = row.startDate && row.targetDate
              ? `${pilotageDate(row.startDate)} → ${pilotageDate(row.targetDate)}`
              : pilotageDate(row.targetDate ?? row.startDate);
            const marker = row.kind === "milestone" ? "milestone" : position?.width === 0 ? "point" : "bar";
            const empty = !row.startDate && !row.targetDate
              ? "Date à fixer"
              : row.startDate && row.targetDate && row.startDate > row.targetDate ? "Dates à vérifier" : "Hors période";
            return (
              <tr key={row.id} id={row.id}>
                <th scope="row" className="roadmap-project">
                  <Link href={row.href} className="roadmap-row-link">
                    <WorkspaceIcon name={row.kind === "project" ? "folder" : row.kind === "milestone" ? "diamond" : "check"} className="h-4 w-4" />
                    <span className="min-w-0">
                      <strong>{row.title}</strong>
                      <span className="roadmap-row-meta">{[row.statusLabel, row.meta, dateLabel !== "—" ? dateLabel : undefined].filter(Boolean).join(" · ")}</span>
                    </span>
                  </Link>
                </th>
                <td colSpan={months.length} className="roadmap-track" data-today={Boolean(todayPosition)}>
                  {position && <span className="roadmap-bar" data-marker={marker} data-status={row.status} style={{ left: `${position.left}%`, width: `${position.width}%` }} title={dateLabel} aria-hidden="true" />}
                  {row.milestones?.map((milestone) => {
                    const milestonePosition = getRoadmapPosition({ targetDate: milestone.dueDate, months });
                    return milestonePosition && <span key={milestone.id} className="roadmap-bar" data-marker="milestone" style={{ left: `${milestonePosition.left}%` }} title={`${milestone.title} · ${pilotageDate(milestone.dueDate)}`}>
                      <span className="sr-only">{milestone.title} · {pilotageDate(milestone.dueDate)}</span>
                    </span>;
                  })}
                  {!position && <span className="roadmap-no-date">{empty}</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
