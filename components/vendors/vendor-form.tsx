"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type VendorFormValues = {
  name: string;
  category?: string | null;
  mainContactName?: string | null;
  mainContactEmail?: string | null;
  notes?: string | null;
};

type VendorFormProps = {
  mode?: "create" | "edit";
  vendorId?: string;
  initialValues?: Partial<VendorFormValues>;
};

export function VendorForm({ mode = "create", vendorId, initialValues }: VendorFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(initialValues?.name ?? "");
  const [category, setCategory] = useState(initialValues?.category ?? "");
  const [mainContactName, setMainContactName] = useState(initialValues?.mainContactName ?? "");
  const [mainContactEmail, setMainContactEmail] = useState(initialValues?.mainContactEmail ?? "");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch(vendorId ? `/api/vendors/${vendorId}` : "/api/vendors", {
      method: vendorId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        category,
        mainContactName,
        mainContactEmail,
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
      setName("");
      setCategory("");
      setMainContactName("");
      setMainContactEmail("");
      setNotes("");
    }

    setLoading(false);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="font-semibold">{mode === "create" ? "Nouveau prestataire" : "Modifier le prestataire"}</h2>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom"
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
          value={mainContactName}
          onChange={(e) => setMainContactName(e.target.value)}
          placeholder="Contact principal"
          className="w-full rounded border border-slate-300 px-3 py-2"
        />
      </div>
      <input
        type="email"
        value={mainContactEmail}
        onChange={(e) => setMainContactEmail(e.target.value)}
        placeholder="Email contact"
        className="w-full rounded border border-slate-300 px-3 py-2"
      />
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
