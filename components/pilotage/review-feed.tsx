import Link from "next/link";
import { WorkspaceIcon, type WorkspaceIconName } from "@/components/ui/workspace-icon";
import { pilotageDate } from "@/lib/services/pilotage-service";
import type { ReviewItem } from "@/lib/services/weekly-review-service";

const icons: Record<ReviewItem["category"], WorkspaceIconName> = {
  Actions: "check",
  Arbitrages: "decision",
  Risques: "alert",
  "Contrôles critiques": "check",
  Préavis: "calendar",
  Prestataires: "folder",
  Planner: "list"
};

export function ReviewFeed({ items, showCategory = true }: { items: ReviewItem[]; showCategory?: boolean }) {
  return (
    <ul className="workspace-feed">
      {items.map((item) => (
        <li key={`${item.category}:${item.id}`} className="review-feed-item">
          <Link href={item.href} className="workspace-feed-row review-feed-row">
            <span className="workspace-feed-icon" data-tone={item.urgency === "urgent" ? "rose" : "blue"}>
              <WorkspaceIcon name={icons[item.category]} className="h-4 w-4" />
            </span>
            <span className="workspace-feed-text">
              <strong>{item.title}</strong>
              <span>{[showCategory && item.category, item.context, item.owner].filter(Boolean).join(" · ")}</span>
            </span>
            <span className="review-feed-meta">
              <span className="review-feed-reasons" data-urgent={item.urgency === "urgent"}>{item.reasons.join(" · ")}</span>
              {item.dueDate && <time dateTime={item.dueDate.toISOString()}>{pilotageDate(item.dueDate)}</time>}
            </span>
            <WorkspaceIcon name="right" className="workspace-feed-arrow h-4 w-4" />
          </Link>
          {item.sourceUrl && <a className="review-source workspace-panel-link" href={item.sourceUrl} target="_blank" rel="noreferrer"
            aria-label={`Ouvrir la source de ${item.title}`}>Source ↗</a>}
        </li>
      ))}
    </ul>
  );
}
