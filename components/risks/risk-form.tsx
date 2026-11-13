"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RISK_LEVELS, RISK_STATUSES } from "@/lib/domain/constants";

type ProjectOption = {
  id: string;
  title: string;
};

type VendorOption = {
  id: string;
  name: string;
};

type RiskFormProps = {
  projects: ProjectOption[];
  vendors: VendorOption[];
};

export function RiskForm({ projects, vendors }: RiskFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState<(typeof RISK_LEVELS)[number]>("MEDIUM");
  const [probability, setProbability] = useState<(typeof RISK_LEVELS)[number]>("MEDIUM");
  const [criticality, setCriticality] = useState<(typeof RISK_LEVELS)[number]>("MEDIUM");
  const [status, setStatus] = useState<(typeof RISK_STATUSES)[number]>("OPEN");
  const [mitigation, setMitigation] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [vendorId, setVendorId] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/risks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        impact,
        probability,
        criticality,
        status,
        mitigation,
        ownerName,
        projectId: projectId || null,
        vendorId: vendorId || null
      })
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Impossible de créer le risque.");
      setLoading(false);
      return;
    }

    setTitle("");
    setDescription("");
    setImpact("MEDIUM");
    setProbability("MEDIUM");
    setCriticality("MEDIUM");
    setStatus("OPEN");
    setMitigation("");
    setOwnerName("");
    setProjectId("");
    setVendorId("");
    setLoading(false);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="form-stack">
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Nouveau risque</h3>
          <p className="form-section-caption">Capture un point d’attention pour arbitrage ou suivi DSI.</p>
        </div>
        <div>
          <label className="field-label">Titre</label>
          <input value={title} onChange={(event) => setTitle(event.target.value)} required className="field-input" />
        </div>
        <div>
          <label className="field-label">Description</label>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="field-textarea" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="field-label">Impact</label>
            <select value={impact} onChange={(event) => setImpact(event.target.value as (typeof RISK_LEVELS)[number])} className="field-select">
              {RISK_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Probabilité</label>
            <select value={probability} onChange={(event) => setProbability(event.target.value as (typeof RISK_LEVELS)[number])} className="field-select">
              {RISK_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Criticité</label>
            <select value={criticality} onChange={(event) => setCriticality(event.target.value as (typeof RISK_LEVELS)[number])} className="field-select">
              {RISK_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
            </select>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="field-label">Statut</label>
            <select value={status} onChange={(event) => setStatus(event.target.value as (typeof RISK_STATUSES)[number])} className="field-select">
              {RISK_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Responsable</label>
            <input value={ownerName} onChange={(event) => setOwnerName(event.target.value)} className="field-input" />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="field-label">Projet</label>
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="field-select">
              <option value="">Aucun</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Prestataire</label>
            <select value={vendorId} onChange={(event) => setVendorId(event.target.value)} className="field-select">
              <option value="">Aucun</option>
              {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="field-label">Mitigation</label>
          <textarea value={mitigation} onChange={(event) => setMitigation(event.target.value)} rows={3} className="field-textarea" />
        </div>
      </section>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="form-actions">
        <p className="form-actions-note">Le risque apparaîtra dans le dashboard et les rapports exécutifs.</p>
        <button disabled={loading} className="button-primary">{loading ? "Création..." : "Créer le risque"}</button>
      </div>
    </form>
  );
}
