import { currentMember } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { reportContent } from "@/lib/services/monthly-report-service";

export async function GET(request: Request) {
  if ((await currentMember())?.role !== "DSI") return new Response(null, { status: 403 });
  const month = new URL(request.url).searchParams.get("month") ?? "";
  if (!/^\d{4}-\d{2}$/.test(month)) return new Response(null, { status: 400 });
  const report = await prisma.monthlyReport.findUnique({ where: { month } });
  if (!report) return new Response(null, { status: 404 });
  return new Response(reportContent(report), {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="direction-${month}.md"`, "Cache-Control": "no-store" }
  });
}
