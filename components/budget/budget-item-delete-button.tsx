"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BudgetItemDeleteButton({ budgetItemId }: { budgetItemId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm("Supprimer cette ligne budgétaire ?")) {
      return;
    }

    setLoading(true);
    const response = await fetch(`/api/budget-items/${budgetItemId}`, { method: "DELETE" });

    if (response.ok) {
      router.push("/budget");
      router.refresh();
      return;
    }

    setLoading(false);
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="rounded border border-red-300 px-4 py-2 text-red-700 disabled:opacity-50"
    >
      {loading ? "Suppression..." : "Supprimer"}
    </button>
  );
}
