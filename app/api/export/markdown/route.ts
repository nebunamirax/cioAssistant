import { NextResponse } from "next/server";
import { getCommunicationTemplate } from "@/lib/communications/templates";
import { COMMUNICATION_STATUSES } from "@/lib/domain/constants";
import { getCommunicationById, listCommunications } from "@/lib/services/communication-service";
import type { CommunicationFilters } from "@/lib/validation/communication";

function parseEnumParam<T extends readonly string[]>(values: T, value: string | null): T[number] | undefined {
  if (!value) {
    return undefined;
  }

  return values.includes(value as T[number]) ? (value as T[number]) : undefined;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC"
  }).format(value);
}

type CommunicationExportItem = NonNullable<Awaited<ReturnType<typeof getCommunicationById>>>;

function buildCommunicationMarkdown(communication: CommunicationExportItem) {
  const sections = [
    `# ${communication.title}`,
    "",
    `- Statut: ${communication.status}`,
    `- Type: ${communication.type ?? "—"}`,
    `- Template: ${getCommunicationTemplate(communication.templateKey)?.label ?? "—"}`,
    `- Projet: ${communication.project?.title ?? "—"}`,
    `- Action: ${communication.action?.title ?? "—"}`,
    `- Contrat: ${communication.contract?.title ?? "—"}`,
    `- Mise a jour: ${formatDate(communication.updatedAt)}`,
    ""
  ];

  if (communication.contentMarkdown) {
    sections.push(communication.contentMarkdown, "");
  } else if (communication.contentText) {
    sections.push("## Contenu", "", communication.contentText, "");
  }

  return sections.join("\n");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const communicationId = searchParams.get("communicationId");

  if (communicationId) {
    const communication = await getCommunicationById(communicationId);

    if (!communication) {
      return NextResponse.json({ error: "Communication not found" }, { status: 404 });
    }

    const markdown = buildCommunicationMarkdown(communication);

    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="communication-${communication.id}.md"`
      }
    });
  }

  const filters: CommunicationFilters = {
    search: searchParams.get("search") ?? undefined,
    status: parseEnumParam(COMMUNICATION_STATUSES, searchParams.get("status")),
    type: searchParams.get("type") ?? undefined,
    projectId: searchParams.get("projectId") ?? undefined,
    actionId: searchParams.get("actionId") ?? undefined,
    contractId: searchParams.get("contractId") ?? undefined
  };
  const communications = await listCommunications(filters);

  const markdown = [
    "# Export communications",
    "",
    ...communications.flatMap((communication, index) => {
      const section = buildCommunicationMarkdown(communication);
      return index === communications.length - 1 ? [section] : [section, "", "---", ""];
    })
  ].join("\n");

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'attachment; filename="communications.md"'
    }
  });
}
