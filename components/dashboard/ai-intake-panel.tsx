"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type IntakeResult = {
  sourceName: string | null;
  provider: {
    provider: string;
    label: string;
    mode: string;
    model: string;
    location: "local" | "cloud";
  };
  summary: string;
  modules: string[];
  created: Array<{
    module: string;
    id: string;
    title: string;
    href: string;
  }>;
};

export function AIIntakePanel() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const file = fileInputRef.current?.files?.[0] ?? null;
    if (!file && text.trim().length < 10) {
      setError("Ajoute un texte ou un document suffisamment descriptif.");
      setLoading(false);
      return;
    }

    const body = new FormData();
    body.set("text", text.trim());
    if (fileName) {
      body.set("sourceName", fileName);
    }
    if (file) {
      body.set("file", file);
    }

    const response = await fetch("/api/ai/intake", {
      method: "POST",
      body
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "L'ingestion IA a échoué.");
      setLoading(false);
      return;
    }

    setResult(payload.data);
    setLoading(false);
  };

  return (
    <section className="workbench-panel space-y-4">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Ingestion IA</p>
        <h2 className="text-xl font-semibold text-slate-950">Ajoute un texte ou un document depuis l’accueil</h2>
        <p className="panel-caption">
          L’IA analyse le contenu et crée directement les entrées dans les modules concernés. Formats supportés: `.txt`, `.md`, `.csv`, `.json`, `.eml`, `.pdf`, `.docx`.
        </p>
      </div>

      <form onSubmit={submit} className="form-stack">
        <section className="form-section space-y-3">
          <div>
            <label className="field-label">Texte source</label>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="field-textarea min-h-[180px]"
              placeholder="Colle ici une note, un mail, un brief fournisseur, un extrait de compte-rendu, un cadrage projet..."
            />
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <label className="field-label">Document texte</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.markdown,.csv,.json,.eml,.pdf,.docx,text/plain,text/markdown,message/rfc822,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="field-input file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
                onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
              />
              <p className="field-hint">Les PDF et DOCX sont extraits côté serveur, puis routés par le provider IA actif.</p>
            </div>
            <button disabled={loading} className="button-primary">
              {loading ? "Analyse en cours..." : "Analyser et créer"}
            </button>
          </div>
        </section>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {result ? (
        <section className="workbench-section space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-950">Création terminée</p>
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
              {result.provider.label} · {result.provider.model} · {result.provider.location}
            </p>
            <p className="text-sm text-slate-600">{result.summary}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.modules.map((module) => (
              <span key={module} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                {module}
              </span>
            ))}
          </div>
          <div className="space-y-2 text-sm text-slate-700">
            {result.created.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <div>
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{item.module}</p>
                </div>
                <Link href={item.href} className="button-secondary">
                  Ouvrir
                </Link>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
