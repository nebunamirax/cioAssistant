import { generateReportMarkdown, type ReportType } from "@/lib/services/report-service";
import { weeklyReview } from "@/lib/services/weekly-review-service";
import { pilotageDate } from "@/lib/services/pilotage-service";
import { currentMember, publicUrl } from "@/lib/auth/session";

function isReportType(value: string | null): value is ReportType {
  return value === "comex" || value === "codir" || value === "budget" || value === "vendors";
}

export async function GET(request: Request) {
  if ((await currentMember())?.role !== "DSI") return new Response(null, { status: 403 });
  const { searchParams } = new URL(request.url);
  const requestedType = searchParams.get("type");
  const type = requestedType === "weekly" || isReportType(requestedType) ? requestedType : "comex";
  const markdown = type === "weekly" ? await weeklyMarkdown() : await generateReportMarkdown(type);

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type === "weekly" ? "revue-hebdomadaire" : `rapport-${type}`}.md"`,
      "Cache-Control": "no-store"
    }
  });
}

const escapeMarkdown = (text: string) => text.replace(/\s+/gu, " ").replace(/[\\`*_[\]<>~&]/gu, "\\$&");

async function weeklyMarkdown() {
  const now = new Date();
  const origin = publicUrl();
  const items = await weeklyReview(now);
  const lines = [`# Revue hebdomadaire du ${pilotageDate(now)}`, ""];
  for (const [urgency, label] of [["urgent", "Urgences"], ["attention", "À suivre"]]) {
    lines.push(`## ${label}`, "");
    const section = items.filter((item) => item.urgency === urgency);
    for (const item of section) {
      const context = [item.category, item.context, item.owner, ...item.reasons, item.dueDate && pilotageDate(item.dueDate)].filter(Boolean).join(" · ");
      lines.push(`- [${escapeMarkdown(item.title)}](${new URL(item.href, origin)}) — ${escapeMarkdown(context)}`);
    }
    if (!section.length) lines.push("Aucun point.");
    lines.push("");
  }
  return lines.join("\n");
}
