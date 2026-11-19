import Link from "next/link";
import { ReviewFeed } from "@/components/pilotage/review-feed";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
import { requireMember } from "@/lib/auth/session";
import { reviewCategories, weeklyReview } from "@/lib/services/weekly-review-service";

export default async function WeeklyReviewPage({ searchParams }: {
  searchParams: Promise<{ category?: string; owner?: string; urgency?: string }>;
}) {
  const member = await requireMember();
  const params = await searchParams;
  const dsi = member.role === "DSI";
  const items = (await weeklyReview()).filter((item) => dsi || item.category === "Actions" ||
    (["Contrôles critiques", "Prestataires"].includes(item.category) && item.href.startsWith("/services/")));
  const categories = reviewCategories.filter((item) => dsi || items.some((row) => row.category === item));
  const owners = [...new Set(items.map((item) => item.owner))].sort((a, b) => a.localeCompare(b, "fr"));
  const category = categories.find((item) => item === params.category);
  const owner = owners.find((item) => item === params.owner);
  const urgency = params.urgency === "urgent" || params.urgency === "attention" ? params.urgency : undefined;
  const filtered = items.filter((item) => (!category || item.category === category) && (!owner || item.owner === owner) &&
    (!urgency || item.urgency === urgency));

  return (
    <div className="workspace-page">
      <header className="workspace-page-heading">
        <div>
          <h1 className="workspace-page-title">Revue hebdomadaire</h1>
          <p className="mt-2 text-sm text-slate-600">{filtered.length} {filtered.length === 1 ? "point à examiner" : "points à examiner"}</p>
        </div>
        {dsi && <div className="flex flex-wrap gap-2">
          <a href="/api/reports/markdown?type=weekly" className="button-secondary gap-2"><WorkspaceIcon name="document" className="h-4 w-4" /> Exporter la revue complète</a>
          <Link href="/reports?type=codir" className="button-primary gap-2">Préparer le CODIR <WorkspaceIcon name="arrow" className="h-4 w-4" /></Link>
        </div>}
      </header>
      <form action="/weekly-review" key={JSON.stringify([category, owner, urgency])} className="workspace-list-filters">
        <select aria-label="Urgence" className="field-select" name="urgency" defaultValue={urgency ?? ""}>
          <option value="">Toutes les priorités</option>
          <option value="urgent">Urgences</option>
          <option value="attention">À suivre</option>
        </select>
        <select aria-label="Catégorie" className="field-select" name="category" defaultValue={category ?? ""}>
          <option value="">Toutes les catégories</option>{categories.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select aria-label="Responsable" className="field-select" name="owner" defaultValue={owner ?? ""}>
          <option value="">Tous les responsables</option>{owners.map((name) => <option key={name}>{name}</option>)}
        </select>
        <button className="button-secondary">Filtrer</button>
        {(category || owner || urgency) && <Link href="/weekly-review" className="workspace-panel-link">Réinitialiser</Link>}
      </form>
      {filtered.length ? (
        <section className="pilot-panel" aria-label="Points de la revue"><ReviewFeed items={filtered} /></section>
      ) : <p className="pilot-panel p-5 text-sm text-slate-600">Aucun point à examiner.</p>}
    </div>
  );
}
