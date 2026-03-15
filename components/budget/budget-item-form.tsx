"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
};

export function BudgetItemForm({
  mode = "create",
  budgetItemId,
  projectOptions,
  contractOptions,
  vendorOptions,
  initialValues
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
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="font-semibold">{mode === "create" ? "Nouvelle ligne budgétaire" : "Modifier la ligne budgétaire"}</h2>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre"
        required
        className="w-full rounded border border-slate-300 px-3 py-2"
      />
      <div className="grid gap-3 md:grid-cols-2">
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Catégorie"
          className="w-full rounded border border-slate-300 px-3 py-2"
        />
        <input
          type="number"
          min="2000"
          max="2100"
          value={fiscalYear}
          onChange={(e) => setFiscalYear(e.target.value)}
          placeholder="Exercice"
          className="w-full rounded border border-slate-300 px-3 py-2"
        />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded border border-slate-300 px-3 py-2">
          <option value="">Aucun projet</option>
          {projectOptions.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
        <select value={contractId} onChange={(e) => setContractId(e.target.value)} className="rounded border border-slate-300 px-3 py-2">
          <option value="">Aucun contrat</option>
          {contractOptions.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
        <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="rounded border border-slate-300 px-3 py-2">
          <option value="">Aucun prestataire</option>
          {vendorOptions.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <input
          type="number"
          min="0"
          step="0.01"
          value={plannedAmount}
          onChange={(e) => setPlannedAmount(e.target.value)}
          placeholder="Prévu"
          className="w-full rounded border border-slate-300 px-3 py-2"
        />
        <input
          type="number"
          min="0"
          step="0.01"
          value={committedAmount}
          onChange={(e) => setCommittedAmount(e.target.value)}
          placeholder="Engagé"
          className="w-full rounded border border-slate-300 px-3 py-2"
        />
        <input
          type="number"
          min="0"
          step="0.01"
          value={estimatedActualAmount}
          onChange={(e) => setEstimatedActualAmount(e.target.value)}
          placeholder="Réel estimé"
          className="w-full rounded border border-slate-300 px-3 py-2"
        />
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes"
        rows={4}
        className="w-full rounded border border-slate-300 px-3 py-2"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={loading} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
        {loading ? (mode === "create" ? "Création..." : "Enregistrement...") : mode === "create" ? "Créer" : "Enregistrer"}
      </button>
    </form>
  );
}
