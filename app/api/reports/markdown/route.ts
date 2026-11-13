import { generateReportMarkdown, type ReportType } from "@/lib/services/report-service";

function isReportType(value: string | null): value is ReportType {
  return value === "comex" || value === "codir" || value === "budget" || value === "vendors";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedType = searchParams.get("type");
  const type = isReportType(requestedType) ? requestedType : "comex";
  const markdown = await generateReportMarkdown(type);

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="rapport-${type}.md"`
    }
  });
}
