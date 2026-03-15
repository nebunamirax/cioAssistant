"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CONTRACT_STATUSES, RENEWAL_TYPES } from "@/lib/domain/constants";

type Option = {
  id: string;
  label: string;
};

type ContractFormValues = {
  vendorId: string;
  projectId?: string | null;
  title: string;
  contractType?: string | null;
  status: (typeof CONTRACT_STATUSES)[number];
  startDate?: string | null;
  endDate?: string | null;
  noticePeriodDays?: string | null;
  amountPlanned?: string | null;
  notes?: string | null;
  renewalType: (typeof RENEWAL_TYPES)[number];
};

type ContractFormProps = {
  mode?: "create" | "edit";
  contractId?: string;
  vendorOptions: Option[];
  projectOptions: Option[];
  initialValues?: Partial<ContractFormValues>;
};

export function ContractForm({
  mode = "create",
  contractId,
  vendorOptions,
  projectOptions,
  initialValues
}: ContractFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState(initialValues?.vendorId ?? vendorOptions[0]?.id ?? "");
  const [projectId, setProjectId] = useState(initialValues?.projectId ?? "");
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [contractType, setContractType] = useState(initialValues?.contractType ?? "");
  const [status, setStatus] = useState<(typeof CONTRACT_STATUSES)[number]>(initialValues?.status ?? "DRAFT");
  const [startDate, setStartDate] = useState(initialValues?.startDate ?? "");
  const [endDate, setEndDate] = useState(initialValues?.endDate ?? "");
  const [noticePeriodDays, setNoticePeriodDays] = useState(initialValues?.noticePeriodDays ?? "");
  const [amountPlanned, setAmountPlanned] = useState(initialValues?.amountPlanned ?? "");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [renewalType, setRenewalType] = useState<(typeof RENEWAL_TYPES)[number]>(initialValues?.renewalType ?? "NONE");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch(contractId ? `/api/contracts/${contractId}` : "/api/contracts", {
      method: contractId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendorId,
        projectId,
        title,
        contractType,
        status,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        noticePeriodDays: noticePeriodDays ? Number(noticePeriodDays) : null,
        amountPlanned: amountPlanned ? Number(amountPlanned) : null,
        notes,
        renewalType
      })
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Une erreur est survenue.");
      setLoading(false);
      return;
    }

    if (mode === "create") {
      setVendorId(vendorOptions[0]?.id ?? "");
      setProjectId("");
      setTitle("");
      setContractType("");
      setStatus("DRAFT");
      setStartDate("");
      setEndDate("");
      setNoticePeriodDays("");
      setAmountPlanned("");
      setNotes("");
      setRenewalType("NONE");
    }

    setLoading(false);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="font-semibold">{mode === "create" ? "Nouveau contrat" : "Modifier le contrat"}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} required className="rounded border border-slate-300 px-3 py-2">
          {vendorOptions.length === 0 && <option value="">Aucun prestataire disponible</option>}
          {vendorOptions.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded border border-slate-300 px-3 py-2">
          <option value="">Aucun projet</option>
          {projectOptions.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre"
        required
        className="w-full rounded border border-slate-300 px-3 py-2"
      />
      <input
        value={contractType}
        onChange={(e) => setContractType(e.target.value)}
        placeholder="Type de contrat"
        className="w-full rounded border border-slate-300 px-3 py-2"
      />
      <div className="grid gap-3 md:grid-cols-2">
        <select value={status} onChange={(e) => setStatus(e.target.value as (typeof CONTRACT_STATUSES)[number])} className="rounded border border-slate-300 px-3 py-2">
          {CONTRACT_STATUSES.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <select value={renewalType} onChange={(e) => setRenewalType(e.target.value as (typeof RENEWAL_TYPES)[number])} className="rounded border border-slate-300 px-3 py-2">
          {RENEWAL_TYPES.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2" />
        <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <input
          type="number"
          min="0"
          value={noticePeriodDays}
          onChange={(e) => setNoticePeriodDays(e.target.value)}
          placeholder="Préavis (jours)"
          className="w-full rounded border border-slate-300 px-3 py-2"
        />
        <input
          type="number"
          min="0"
          step="0.01"
          value={amountPlanned}
          onChange={(e) => setAmountPlanned(e.target.value)}
          placeholder="Montant prévu"
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
      <button disabled={loading || vendorOptions.length === 0} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
        {loading ? (mode === "create" ? "Création..." : "Enregistrement...") : mode === "create" ? "Créer" : "Enregistrer"}
      </button>
    </form>
  );
}
