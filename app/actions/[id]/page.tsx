import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";

export default async function ActionDetailPage({ params }: { params: { id: string } }) {
  const action = await prisma.action.findUnique({ where: { id: params.id }, include: { project: true, vendor: true, contract: true } });

  if (!action) return notFound();

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">{action.title}</h1>
      <p><strong>Statut:</strong> {action.status}</p>
      <p><strong>Priorité:</strong> {action.priority}</p>
      <p><strong>Description:</strong> {action.description ?? "—"}</p>
      <p><strong>Projet:</strong> {action.project?.title ?? "—"}</p>
      <p><strong>Fournisseur:</strong> {action.vendor?.name ?? "—"}</p>
      <p><strong>Contrat:</strong> {action.contract?.title ?? "—"}</p>
    </div>
  );
}
