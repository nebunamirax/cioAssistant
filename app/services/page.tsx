import Link from "next/link";
import { requireMember } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { controlState } from "@/lib/services/support-service";
import { ServiceForm } from "./service-form";

export default async function ServicesPage() {
  const member = await requireMember();
  const services = await prisma.supportService.findMany({
    include: { owner: { select: { name: true } }, vendor: true, controls: { orderBy: [{ checkedAt: "desc" }, { createdAt: "desc" }], take: 1 } },
    orderBy: { title: "asc" }
  });
  return <div className="space-y-4">
    <h1 className="workbench-header text-2xl font-semibold">Services</h1>
    {member.role === "DSI" && <details className="workbench-panel"><summary className="cursor-pointer font-semibold">Nouveau service</summary><ServiceForm /></details>}
    <div className="workbench-table-shell"><table className="workbench-table">
      <thead><tr><th>Service</th><th>Criticité</th><th>Responsable</th><th>Prestataire</th><th>Contrôle</th></tr></thead>
      <tbody>{services.map((service) => <tr key={service.id}>
        <td><Link className="pilot-row-link" href={`/services/${service.id}`}>{service.title}</Link></td>
        <td>{service.criticality ?? "—"}</td><td>{service.owner?.name ?? "—"}</td><td>{service.vendor?.name ?? "—"}</td>
        <td>{controlState(service.controls[0]).join(" · ")}</td>
      </tr>)}</tbody>
    </table>{!services.length && <p className="p-4">Aucun service renseigné.</p>}</div>
  </div>;
}
