"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TokenForm() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  return <form className="space-y-3" onSubmit={async (event) => {
    event.preventDefault();
    const label = new FormData(event.currentTarget).get("label");
    setPending(true);
    setError("");
    setToken("");
    try {
      const response = await fetch("/api/integrations/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label }) });
      if (!response.ok) throw new Error("Création impossible.");
      setToken((await response.json()).token);
      router.refresh();
    } catch {
      setError("Création impossible. Réessayez.");
    } finally {
      setPending(false);
    }
  }}>
    <label className="field-label">Nom du jeton<input name="label" required maxLength={120} className="field-input" placeholder="Claude Desktop · poste DSI" /></label>
    <button className="button-primary" disabled={pending}>Créer un jeton</button>
    {token && <label className="field-label">Copiez ce jeton maintenant. Il est affiché une seule fois.
      <input className="field-input font-mono" readOnly value={token} onFocus={(event) => event.target.select()} />
    </label>}
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
