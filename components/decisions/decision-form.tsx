"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DECISION_STATUSES } from "@/lib/domain/constants";

type ProjectOption = {
  id: string;
  title: string;
};

type DecisionFormProps = {
  projects: ProjectOption[];
};

export function DecisionForm({ projects }: DecisionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [context, setContext] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [decider, setDecider] = useState("");
  const [status, setStatus] = useState<(typeof DECISION_STATUSES)[number]>("PENDING");
  const [targetDate, setTargetDate] = useState("");
  const [projectId, setProjectId] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/decisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        context,
        options: optionsText.split("\n").map((value) => value.trim()).filter(Boolean),
        recommendation,
        decider,
        status,
        targetDate: targetDate ? new Date(targetDate).toISOString() : null,
        projectId: projectId || null
      })
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Impossible de créer la décision.");
      setLoading(false);
      return;
    }

    setSubject("");
    setContext("");
    setOptionsText("");
    setRecommendation("");
    setDecider("");
    setStatus("PENDING");
    setTargetDate("");
    setProjectId("");
    setLoading(false);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="form-stack">
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Nouvelle décision</h3>
          <p className="form-section-caption">Prépare une demande d’arbitrage avec contexte, options et recommandation.</p>
        </div>
        <div>
          <label className="field-label">Sujet</label>
          <input value={subject} onChange={(event) => setSubject(event.target.value)} required className="field-input" />
        </div>
        <div>
          <label className="field-label">Contexte</label>
          <textarea value={context} onChange={(event) => setContext(event.target.value)} rows={3} className="field-textarea" />
        </div>
        <div>
          <label className="field-label">Options</label>
          <textarea
            value={optionsText}
            onChange={(event) => setOptionsText(event.target.value)}
            rows={3}
            className="field-textarea"
            placeholder="Une option par ligne"
          />
        </div>
        <div>
          <label className="field-label">Recommandation DSI</label>
          <textarea value={recommendation} onChange={(event) => setRecommendation(event.target.value)} rows={3} className="field-textarea" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="field-label">Décideur</label>
            <input value={decider} onChange={(event) => setDecider(event.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">Statut</label>
            <select value={status} onChange={(event) => setStatus(event.target.value as (typeof DECISION_STATUSES)[number])} className="field-select">
              {DECISION_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
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
            <label className="field-label">Date cible</label>
            <input type="datetime-local" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} className="field-input" />
          </div>
        </div>
      </section>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="form-actions">
        <p className="form-actions-note">Les décisions en attente remontent dans le cockpit exécutif.</p>
        <button disabled={loading} className="button-primary">{loading ? "Création..." : "Créer la décision"}</button>
      </div>
    </form>
  );
}
