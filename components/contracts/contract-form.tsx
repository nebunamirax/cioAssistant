"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  showHeader?: boolean;
};

export function ContractForm({
  mode = "create",
  contractId,
  vendorOptions,
  projectOptions,
  initialValues,
  showHeader = true
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

  useEffect(() => {
    setVendorId(initialValues?.vendorId ?? vendorOptions[0]?.id ?? "");
    setProjectId(initialValues?.projectId ?? "");
    setTitle(initialValues?.title ?? "");
    setContractType(initialValues?.contractType ?? "");
    setStatus(initialValues?.status ?? "DRAFT");
    setStartDate(initialValues?.startDate ?? "");
    setEndDate(initialValues?.endDate ?? "");
    setNoticePeriodDays(initialValues?.noticePeriodDays ?? "");
    setAmountPlanned(initialValues?.amountPlanned ?? "");
    setNotes(initialValues?.notes ?? "");
    setRenewalType(initialValues?.renewalType ?? "NONE");
  }, [contractId, initialValues, mode, vendorOptions]);

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
    <form onSubmit={submit} className="form-stack">
      {showHeader && <h2 className="panel-title">{mode === "create" ? "Nouveau contrat" : "Modifier le contrat"}</h2>}
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Identification</h3>
          <p className="form-section-caption">Associe le contrat au bon prestataire et donne-lui un intitulé exploitable dans les listes.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="field-label">Prestataire</label>
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} required className="field-select">
              {vendorOptions.length === 0 && <option value="">Aucun prestataire disponible</option>}
              {vendorOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Projet</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="field-select">
              <option value="">Aucun projet</option>
              {projectOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="field-label">Titre</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Contrat support Microsoft"
            required
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Type de contrat</label>
          <input
            value={contractType}
            onChange={(e) => setContractType(e.target.value)}
            placeholder="Support, licence, infogérance..."
            className="field-input"
          />
        </div>
      </section>
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Cycle de vie</h3>
          <p className="form-section-caption">Renseigne le statut administratif et la logique de renouvellement.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="field-label">Statut</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as (typeof CONTRACT_STATUSES)[number])} className="field-select">
              {CONTRACT_STATUSES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Renouvellement</label>
            <select value={renewalType} onChange={(e) => setRenewalType(e.target.value as (typeof RENEWAL_TYPES)[number])} className="field-select">
              {RENEWAL_TYPES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>
      </section>
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Échéances et montant</h3>
          <p className="form-section-caption">Ajoute les dates et repères financiers qui servent au suivi contractuel.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="field-label">Début</label>
            <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">Fin</label>
            <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="field-input" />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="field-label">Préavis</label>
            <input
              type="number"
              min="0"
              value={noticePeriodDays}
              onChange={(e) => setNoticePeriodDays(e.target.value)}
              placeholder="Nombre de jours"
              className="field-input"
            />
            <p className="field-hint">Utile pour faire ressortir les fenêtres de décision avant échéance.</p>
          </div>
          <div>
            <label className="field-label">Montant prévu</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amountPlanned}
              onChange={(e) => setAmountPlanned(e.target.value)}
              placeholder="Montant annuel ou total"
              className="field-input"
            />
          </div>
        </div>
      </section>
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Notes</h3>
          <p className="form-section-caption">Conserve ici les clauses particulières ou les points à surveiller.</p>
        </div>
        <div>
          <label className="field-label">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Clause de sortie, dépendances, risques..."
            rows={4}
            className="field-textarea"
          />
        </div>
      </section>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="form-actions">
        <p className="form-actions-note">Un prestataire est requis pour créer ou modifier un contrat.</p>
        <button disabled={loading || vendorOptions.length === 0} className="button-primary">
          {loading ? (mode === "create" ? "Création..." : "Enregistrement...") : mode === "create" ? "Créer le contrat" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
