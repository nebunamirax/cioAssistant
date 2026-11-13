import Link from "next/link";
import { requireMember } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { allowedMonths, reportContent, reportFingerprint } from "@/lib/services/monthly-report-service";
import { freezeMonthly, generateMonthly } from "./mutations";
import { PrintButton } from "./print-button";

export default async function Direction({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireMember("DSI");
  const months = allowedMonths();
  const { month = months[0] } = await searchParams;
  const [report, archives] = await Promise.all([
    prisma.monthlyReport.findUnique({ where: { month } }),
    prisma.monthlyReport.findMany({ where: { archivedAt: { not: null } }, select: { month: true }, orderBy: { month: "desc" } })
  ]);
  return <div className="space-y-4">
    <header className="workbench-header print:hidden"><h1 className="text-2xl font-semibold">Direction mensuelle</h1><Link href="/reports" className="button-secondary">Rapports</Link></header>
    <nav className="flex flex-wrap gap-2 print:hidden">{[...new Set([...months, ...archives.map((item) => item.month)])].map((item) =>
      <Link className={item === month ? "button-primary" : "button-secondary"} key={item} href={`?month=${item}`}>{item}</Link>)}</nav>
    {!report?.archivedAt && months.includes(month) && <form action={generateMonthly} className="workbench-panel space-y-2 print:hidden">
      <input type="hidden" name="month" value={month} />
      <label className="field-label">Commentaire DSI<textarea className="field-textarea" name="comment" maxLength={2400} defaultValue={report?.comment} /></label>
      <button className="button-primary">{report ? "Actualiser le brouillon et enregistrer" : "Générer le brouillon"}</button>
    </form>}
    {report && <section className="workbench-panel space-y-3 print:border-0 print:shadow-none">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <strong>{report.archivedAt ? "Version archivée" : "Brouillon"}</strong>
        <a href={`/api/reports/direction?month=${month}`} className="button-secondary">Markdown</a>
        <PrintButton />
        {!report.archivedAt && <form action={freezeMonthly}><input type="hidden" name="month" value={month} /><input type="hidden" name="fingerprint" value={reportFingerprint(report)} /><button className="button-primary">Figer et archiver</button></form>}
      </div>
      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{reportContent(report)}</pre>
    </section>}
  </div>;
}
