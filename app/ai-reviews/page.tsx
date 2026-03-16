import Link from "next/link";

import { ReviewEditor } from "@/components/intake-review/review-editor";
import { getAIIntakeReviewById, listAIIntakeReviews } from "@/lib/services/ai-intake-review-service";

type AIReviewListItem = Awaited<ReturnType<typeof listAIIntakeReviews>>[number];

type AIReviewsPageProps = {
  searchParams?: {
    selectedId?: string;
    status?: string;
  };
};

function getReviewStatusPresentation(review: AIReviewListItem) {
  if (review.status === "PENDING") {
    return {
      label: "A traiter",
      tone: "border-amber-200 bg-amber-50 text-amber-900",
      eventLabel: "Demandee le",
      eventDate: review.createdAt
    };
  }

  if (review.status === "APPROVED" && review.createdEntityHref) {
    return {
      label: "Creee",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
      eventLabel: "Creee le",
      eventDate: review.reviewedAt ?? review.updatedAt
    };
  }

  if (review.status === "APPROVED") {
    return {
      label: "Validee",
      tone: "border-sky-200 bg-sky-50 text-sky-900",
      eventLabel: "Traitee le",
      eventDate: review.reviewedAt ?? review.updatedAt
    };
  }

  return {
    label: "Classee",
    tone: "border-slate-200 bg-slate-100 text-slate-800",
    eventLabel: "Classee le",
    eventDate: review.reviewedAt ?? review.updatedAt
  };
}

export default async function AIReviewsPage({ searchParams }: AIReviewsPageProps) {
  const status = searchParams?.status === "APPROVED" || searchParams?.status === "REJECTED" || searchParams?.status === "PENDING"
    ? searchParams.status
    : undefined;

  const [reviews, selectedReview] = await Promise.all([
    listAIIntakeReviews(status),
    searchParams?.selectedId ? getAIIntakeReviewById(searchParams.selectedId) : null
  ]);
  const activeReview = selectedReview ?? reviews[0] ?? null;

  const baseParams = new URLSearchParams();
  if (status) {
    baseParams.set("status", status);
  }

  const buildSelectionHref = (selectedId?: string) => {
    const params = new URLSearchParams(baseParams);
    if (selectedId) {
      params.set("selectedId", selectedId);
    }

    const query = params.toString();
    return query ? `/ai-reviews?${query}` : "/ai-reviews";
  };

  const pendingCount = reviews.filter((review: AIReviewListItem) => review.status === "PENDING").length;
  const createdCount = reviews.filter((review: AIReviewListItem) => review.status === "APPROVED" && Boolean(review.createdEntityHref)).length;
  const closedCount = reviews.filter((review: AIReviewListItem) => review.status === "REJECTED").length;

  return (
    <div className="space-y-4">
      <div className="workbench-header">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Revue IA</h1>
          <p className="text-sm text-slate-600">Traite les demandes que l’IA n’a pas pu ranger proprement. Choisis le module, complète les champs, puis valide la création.</p>
          <div className="workbench-kpi-grid">
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">A traiter</div>
              <div className="workbench-kpi-value">{pendingCount}</div>
            </div>
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Creees</div>
              <div className="workbench-kpi-value">{createdCount}</div>
            </div>
            <div className="workbench-kpi">
              <div className="workbench-kpi-label">Classees</div>
              <div className="workbench-kpi-value">{closedCount}</div>
            </div>
          </div>
        </div>
        {searchParams?.selectedId && activeReview ? (
          <Link href={buildSelectionHref()} className="button-secondary">
            Fermer le panneau
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr),460px]">
        <section className="workbench-table-shell">
          <table className="workbench-table">
            <thead>
              <tr>
                <th>Statut</th>
                <th>Source</th>
                <th>Résumé</th>
                <th>Motif</th>
                <th>Dernier état</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review: AIReviewListItem) => {
                const statusPresentation = getReviewStatusPresentation(review);

                return (
                  <tr key={review.id} data-selected={activeReview?.id === review.id} className="group">
                    <td>
                      <Link href={buildSelectionHref(review.id)} className="block py-1 group-hover:underline">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${statusPresentation.tone}`}>
                          {statusPresentation.label}
                        </span>
                      </Link>
                    </td>
                    <td>
                      <Link href={buildSelectionHref(review.id)} className="block py-1 font-medium text-slate-900 group-hover:underline">
                        {review.sourceName ?? "Texte libre"}
                      </Link>
                    </td>
                    <td>
                      <Link href={buildSelectionHref(review.id)} className="block py-1 text-slate-700">
                        {review.summary ?? "—"}
                      </Link>
                    </td>
                    <td>
                      <Link href={buildSelectionHref(review.id)} className="block py-1 text-slate-700">
                        {review.reviewReason ?? "—"}
                      </Link>
                    </td>
                    <td>
                      <Link href={buildSelectionHref(review.id)} className="block py-1 text-slate-700">
                        <span className="font-medium text-slate-900">{statusPresentation.eventLabel}</span>
                        <br />
                        {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(statusPresentation.eventDate)}
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {reviews.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-slate-500">Aucune demande en revue.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <section className="workbench-panel">
            <div className="mb-4">
              <h2 className="panel-title">{activeReview ? "Traiter la demande" : "Sélectionne une demande"}</h2>
              <p className="panel-caption">
                {activeReview
                  ? "Complète le brouillon ci-dessous puis valide la création."
                  : "La colonne de droite sert à catégoriser et valider les demandes non reconnues automatiquement."}
              </p>
            </div>
            {activeReview ? (
              <ReviewEditor review={activeReview} />
            ) : (
              <p className="text-sm text-slate-600">Choisis une ligne dans la liste pour afficher la demande et la catégoriser.</p>
            )}
          </section>

          {activeReview ? (
            <>
              <section className="workbench-panel panel-stat-list">
                <h3 className="panel-title">Texte source</h3>
                <pre className="whitespace-pre-wrap text-sm text-slate-700">{activeReview.rawText}</pre>
              </section>

              <section className="workbench-panel panel-stat-list">
                <h3 className="panel-title">Contexte IA</h3>
                <p><strong>Provider:</strong> {activeReview.providerLabel}</p>
                <p><strong>Modèle:</strong> {activeReview.providerModel}</p>
                <p><strong>Modules suggérés:</strong> {activeReview.suggestedModules.length > 0 ? activeReview.suggestedModules.join(", ") : "—"}</p>
                <p><strong>Motif:</strong> {activeReview.reviewReason ?? "—"}</p>
              </section>
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
