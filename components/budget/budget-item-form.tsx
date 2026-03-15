"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Option = {
  id: string;
  label: string;
};

type BudgetItemFormValues = {
  title: string;
  category?: string | null;
  projectId?: string | null;
  contractId?: string | null;
  vendorId?: string | null;
  fiscalYear?: string | null;
  plannedAmount?: string | null;
  committedAmount?: string | null;
  estimatedActualAmount?: string | null;
  notes?: string | null;
};

type BudgetItemFormProps = {
  mode?: "create" | "edit";
  budgetItemId?: string;
  projectOptions: Option[];
  contractOptions: Option[];
  vendorOptions: Option[];
  initialValues?: Partial<BudgetItemFormValues>;
  showHeader?: boolean;
};

export function BudgetItemForm({
  mode = "create",
  budgetItemId,
  projectOptions,
  contractOptions,
  vendorOptions,
  initialValues,
  showHeader = true
}: BudgetItemFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [category, setCategory] = useState(initialValues?.category ?? "");
  const [projectId, setProjectId] = useState(initialValues?.projectId ?? "");
  const [contractId, setContractId] = useState(initialValues?.contractId ?? "");
  const [vendorId, setVendorId] = useState(initialValues?.vendorId ?? "");
  const [fiscalYear, setFiscalYear] = useState(initialValues?.fiscalYear ?? "");
  const [plannedAmount, setPlannedAmount] = useState(initialValues?.plannedAmount ?? "");
  const [committedAmount, setCommittedAmount] = useState(initialValues?.committedAmount ?? "");
  const [estimatedActualAmount, setEstimatedActualAmount] = useState(initialValues?.estimatedActualAmount ?? "");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");

  useEffect(() => {
    setTitle(initialValues?.title ?? "");
    setCategory(initialValues?.category ?? "");
    setProjectId(initialValues?.projectId ?? "");
    setContractId(initialValues?.contractId ?? "");
    setVendorId(initialValues?.vendorId ?? "");
    setFiscalYear(initialValues?.fiscalYear ?? "");
    setPlannedAmount(initialValues?.plannedAmount ?? "");
    setCommittedAmount(initialValues?.committedAmount ?? "");
    setEstimatedActualAmount(initialValues?.estimatedActualAmount ?? "");
    setNotes(initialValues?.notes ?? "");
  }, [budgetItemId, initialValues, mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch(budgetItemId ? `/api/budget-items/${budgetItemId}` : "/api/budget-items", {
      method: budgetItemId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        category,
        projectId,
        contractId,
        vendorId,
        fiscalYear: fiscalYear ? Number(fiscalYear) : null,
        plannedAmount: plannedAmount ? Number(plannedAmount) : null,
        committedAmount: committedAmount ? Number(committedAmount) : null,
        estimatedActualAmount: estimatedActualAmount ? Number(estimatedActualAmount) : null,
        notes
      })
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Une erreur est survenue.");
      setLoading(false);
      return;
    }

    if (mode === "create") {
      setTitle("");
      setCategory("");
      setProjectId("");
      setContractId("");
      setVendorId("");
      setFiscalYear("");
      setPlannedAmount("");
      setCommittedAmount("");
      setEstimatedActualAmount("");
      setNotes("");
    }

    setLoading(false);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="form-stack">
      {showHeader && <h2 className="panel-title">{mode === "create" ? "Nouvelle ligne budgétaire" : "Modifier la ligne budgétaire"}</h2>}
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Identification budgétaire</h3>
          <p className="form-section-caption">Décris la ligne et l’exercice auquel elle doit être rattachée.</p>
        </div>
        <div>
          <label className="field-label">Titre</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Renouvellement licences M365"
            required
            className="field-input"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="field-label">Catégorie</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Run, projet, matériel, licence..."
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">Exercice</label>
            <input
              type="number"
              min="2000"
              max="2100"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              placeholder="2026"
              className="field-input"
            />
          </div>
        </div>
      </section>
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Rattachement</h3>
          <p className="form-section-caption">Associe la ligne au bon niveau de contexte: projet, contrat ou prestataire.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="field-label">Projet</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="field-select">
              <option value="">Aucun projet</option>
              {projectOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Contrat</label>
            <select value={contractId} onChange={(e) => setContractId(e.target.value)} className="field-select">
              <option value="">Aucun contrat</option>
              {contractOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Prestataire</label>
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="field-select">
              <option value="">Aucun prestataire</option>
              {vendorOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Montants</h3>
          <p className="form-section-caption">Renseigne les trois vues utiles au suivi: prévu, engagé, puis réel estimé.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="field-label">Prévu</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={plannedAmount}
              onChange={(e) => setPlannedAmount(e.target.value)}
              placeholder="Budget validé"
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">Engagé</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={committedAmount}
              onChange={(e) => setCommittedAmount(e.target.value)}
              placeholder="Commandes / contrats engagés"
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">Réel estimé</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={estimatedActualAmount}
              onChange={(e) => setEstimatedActualAmount(e.target.value)}
              placeholder="Projection de fin d’exercice"
              className="field-input"
            />
          </div>
        </div>
      </section>
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Notes</h3>
          <p className="form-section-caption">Ajoute ici les hypothèses budgétaires ou les commentaires de suivi.</p>
        </div>
        <div>
          <label className="field-label">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Hypothèses, décalage prévu, éléments de validation..."
            rows={4}
            className="field-textarea"
          />
        </div>
      </section>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="form-actions">
        <p className="form-actions-note">Une ligne peut rester partiellement renseignée puis être complétée plus tard.</p>
        <button disabled={loading} className="button-primary">
          {loading ? (mode === "create" ? "Création..." : "Enregistrement...") : mode === "create" ? "Créer la ligne" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
