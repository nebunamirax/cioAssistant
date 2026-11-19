"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TokenForm() {
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  if (token) return <div className="space-y-3">
    <p role="status" className="font-medium">Jeton créé. Copiez-le maintenant, il ne sera plus affiché après avoir cliqué sur Terminé.</p>
    <label className="field-label">Jeton à renseigner dans le client MCP
      <input className="field-input font-mono" readOnly value={token} onFocus={(event) => event.currentTarget.select()} />
    </label>
    <div className="flex flex-wrap gap-2">
      <button type="button" className="button-primary" onClick={async () => {
        try {
          await navigator.clipboard.writeText(token);
          setError("");
          setCopied(true);
        } catch {
          setError("Sélectionnez le jeton et copiez-le manuellement.");
        }
      }}>{copied ? "Jeton copié" : "Copier le jeton"}</button>
      <button type="button" className="button-secondary" onClick={() => {
        setToken("");
        setCopied(false);
        setError("");
        router.refresh();
      }}>Terminé</button>
    </div>
    {error && <p role="alert">{error}</p>}
  </div>;

  return <form className="space-y-3" onSubmit={async (event) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const label = fields.get("label");
    const scope = fields.get("scope");
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/integrations/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label, scope }) });
      if (response.status === 403) {
        setError("Accès refusé. Ouvrez cette page à l’adresse configurée et reconnectez-vous avec votre compte DSI.");
        return;
      }
      if (response.status === 422) {
        setError("Vérifiez le nom et les droits du jeton.");
        return;
      }
      if (!response.ok) throw new Error("Création impossible.");
      setToken((await response.json()).token);
    } catch {
      setError("Création impossible. Réessayez.");
    } finally {
      setPending(false);
    }
  }}>
    <label className="field-label">Nom du jeton<input name="label" required maxLength={120} className="field-input" placeholder="ChatGPT · DSI" /></label>
    <label className="field-label">Droits du jeton
      <select name="scope" className="field-select" defaultValue="LECTURE">
        <option value="LECTURE">Lecture seule</option>
        <option value="PILOTAGE">Lecture et modification des fiches</option>
      </select>
    </label>
    <p className="field-hint">Le jeton est valable 90 jours. Vous pouvez le révoquer à tout moment.</p>
    <button className="button-primary" disabled={pending}>Créer un jeton</button>
    {error && <p role="alert">{error}</p>}
  </form>;
}

export function RevokeToken({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState(false);
  return <div><button type="button" className="button-secondary" onClick={async () => {
    try {
      const response = await fetch(`/api/integrations/claude/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      router.refresh();
    } catch { setError(true); }
  }}>Révoquer</button>{error && <p role="alert">Révocation impossible.</p>}</div>;
}
