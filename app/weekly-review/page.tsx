import Link from "next/link";
import { WorkspaceIcon, type WorkspaceIconName } from "@/components/ui/workspace-icon";
import { requireMember } from "@/lib/auth/session";
import { reviewCategories, weeklyReview } from "@/lib/services/weekly-review-service";

const categoryIcons: Record<(typeof reviewCategories)[number], WorkspaceIconName> = {
  Actions: "check",
  Prestataires: "folder",
  "Contrôles critiques": "alert",
  Préavis: "calendar",
  Arbitrages: "decision"
};

export default async function WeeklyReviewPage({ searchParams }: { searchParams: Promise<{ category?: string; owner?: string }> }) {
  const member = await requireMember();
  const { category, owner } = await searchParams;
  const dsi = member.role === "DSI";
  const items = (await weeklyReview()).filter((item) => dsi ||
    (["Actions", "Contrôles critiques", "Prestataires"].includes(item.category) && !item.href.startsWith("/projects")));
  const categories = reviewCategories.filter((item) => dsi || items.some((row) => row.category === item));
  const owners = [...new Set(items.map((item) => item.owner))].sort((a, b) => a.localeCompare(b, "fr"));
  const filtered = items.filter((item) => (!category || item.category === category) && (!owner || item.owner === owner));
  const groups = categories.map((name) => ({ name, rows: filtered.filter((item) => item.category === name) })).filter((group) => group.rows.length);

  return (
    <div className="workspace-page">
      <header className="workspace-page-heading">
        <div>
          <h1 className="workspace-page-title">Revue hebdomadaire</h1>
          <p className="mt-2 text-sm text-slate-600">{filtered.length} {filtered.length === 1 ? "point à examiner" : "points à examiner"}</p>
        </div>
        {dsi && <Link href="/reports?type=codir" className="button-secondary gap-2"><WorkspaceIcon name="document" className="h-4 w-4" /> Préparer le CODIR</Link>}
      </header>
      <form action="/weekly-review" key={`${category ?? ""}|${owner ?? ""}`} className="workspace-list-filters">
        <select aria-label="Catégorie" className="field-select" name="category" defaultValue={category ?? ""}>
          <option value="">Toutes les catégories</option>{categories.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select aria-label="Responsable" className="field-select" name="owner" defaultValue={owner ?? ""}>
          <option value="">Tous les responsables</option>{owners.map((name) => <option key={name}>{name}</option>)}
        </select>
        <button className="button-secondary">Filtrer</button>
        {(category || owner) && <Link href="/weekly-review" className="workspace-panel-link">Réinitialiser</Link>}
      </form>
      {groups.map(({ name, rows }) => (
        <section key={name} className="pilot-panel">
          <div className="workspace-panel-heading"><h2>{name}</h2><span className="text-xs tabular-nums text-slate-600">{rows.length}</span></div>
          <ul className="workspace-feed">
            {rows.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className="workspace-feed-row">
                  <span className="workspace-feed-icon" data-tone={name === "Arbitrages" ? "violet" : "blue"}><WorkspaceIcon name={categoryIcons[name]} className="h-4 w-4" /></span>
                  <span className="workspace-feed-text"><strong>{item.title}</strong><span>{[item.owner, ...item.reasons].join(" · ")}</span></span>
                  <WorkspaceIcon name="right" className="workspace-feed-arrow h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!groups.length && <p className="pilot-panel p-5 text-sm text-slate-600">Aucun point à examiner.</p>}
    </div>
  );
}
