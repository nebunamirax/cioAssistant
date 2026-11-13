import Link from "next/link";
import { REPORT_TYPES, generateReportMarkdown, type ReportType } from "@/lib/services/report-service";

type ReportsPageProps = {
  searchParams?: Promise<{
    type?: string;
  }>;
};

function isReportType(value: string | undefined): value is ReportType {
  return value === "comex" || value === "codir" || value === "budget" || value === "vendors";
}

export default async function ReportsPage({ searchParams: searchParamsPromise }: ReportsPageProps) {
  const searchParams = await searchParamsPromise;
  const selectedType = isReportType(searchParams?.type) ? searchParams.type : "comex";
  const markdown = await generateReportMarkdown(selectedType);

  return (
    <div className="space-y-4">
      <header className="workbench-header">
        <h1 className="text-2xl font-semibold">Rapports</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/reports/direction" className="button-primary">Rapport mensuel</Link>
          <a href="/api/export/business" className="button-secondary">Exporter les données (JSON)</a>
        </div>
      </header>

      <nav aria-label="Types de rapport" className="flex flex-wrap gap-2">
        {REPORT_TYPES.map((report) => (
          <Link key={report.type} href={`/reports?type=${report.type}`}
            aria-current={selectedType === report.type ? "page" : undefined}
            className={selectedType === report.type ? "button-primary" : "button-secondary"}>
            {report.label}
          </Link>
        ))}
      </nav>

      <section className="workbench-panel space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="panel-title">Aperçu</h2>
          <a href={`/api/reports/markdown?type=${selectedType}`} className="button-secondary">Exporter en Markdown</a>
        </div>
        <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-800">
          {markdown}
        </pre>
      </section>
    </div>
  );
}
