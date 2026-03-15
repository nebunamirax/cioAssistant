"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  showHeader?: boolean;
};

export function VendorForm({ mode = "create", vendorId, initialValues, showHeader = true }: VendorFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(initialValues?.name ?? "");
  const [category, setCategory] = useState(initialValues?.category ?? "");
  const [mainContactName, setMainContactName] = useState(initialValues?.mainContactName ?? "");
  const [mainContactEmail, setMainContactEmail] = useState(initialValues?.mainContactEmail ?? "");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");

  useEffect(() => {
    setName(initialValues?.name ?? "");
    setCategory(initialValues?.category ?? "");
    setMainContactName(initialValues?.mainContactName ?? "");
    setMainContactEmail(initialValues?.mainContactEmail ?? "");
    setNotes(initialValues?.notes ?? "");
  }, [initialValues, mode, vendorId]);

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
    <form onSubmit={submit} className="form-stack">
      {showHeader && <h2 className="panel-title">{mode === "create" ? "Nouveau prestataire" : "Modifier le prestataire"}</h2>}
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Fiche prestataire</h3>
          <p className="form-section-caption">Commence par une identification claire pour faciliter la recherche et les rattachements.</p>
        </div>
        <div>
          <label className="field-label">Nom</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Orange Business"
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
              placeholder="Télécom, cloud, intégration..."
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">Contact principal</label>
            <input
              value={mainContactName}
              onChange={(e) => setMainContactName(e.target.value)}
              placeholder="Nom du contact principal"
              className="field-input"
            />
          </div>
        </div>
        <div>
          <label className="field-label">Email contact</label>
          <input
            type="email"
            value={mainContactEmail}
            onChange={(e) => setMainContactEmail(e.target.value)}
            placeholder="prenom.nom@prestataire.com"
            className="field-input"
          />
        </div>
      </section>
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Notes</h3>
          <p className="form-section-caption">Ajoute ici les éléments de relation fournisseur qui n’ont pas leur place dans les champs structurés.</p>
        </div>
        <div>
          <label className="field-label">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Escalade, contexte relationnel, éléments contractuels..."
            rows={4}
            className="field-textarea"
          />
        </div>
      </section>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="form-actions">
        <p className="form-actions-note">Le nom du prestataire sert de clé d’entrée dans les autres modules.</p>
        <button disabled={loading} className="button-primary">
          {loading ? (mode === "create" ? "Création..." : "Enregistrement...") : mode === "create" ? "Créer le prestataire" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
