import { type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  meetingNoteFilterSchema,
  meetingNoteSchema,
  meetingNoteUpdateSchema,
  type MeetingNoteFilters,
  type MeetingNoteInput,
  type MeetingNoteUpdateInput
} from "@/lib/validation/meeting-note";

function toNullableString(value?: string | null) {
  if (value === undefined) return undefined;
  return value?.trim() ? value : null;
}

function toJsonString(values?: string[]) {
  if (values === undefined) return undefined;
  return JSON.stringify(values);
}

function parseJsonArray(value?: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function toMeetingDate(value?: string | null) {
  return value ? new Date(value) : undefined;
}

function hydrateMeetingNote<T extends {
  attendeesJson?: string | null;
  extractedActionsJson?: string | null;
  extractedDecisionsJson?: string | null;
  extractedRisksJson?: string | null;
  extractedDeadlinesJson?: string | null;
}>(meetingNote: T) {
  return {
    ...meetingNote,
    attendees: parseJsonArray(meetingNote.attendeesJson),
    extractedActions: parseJsonArray(meetingNote.extractedActionsJson),
    extractedDecisions: parseJsonArray(meetingNote.extractedDecisionsJson),
    extractedRisks: parseJsonArray(meetingNote.extractedRisksJson),
    extractedDeadlines: parseJsonArray(meetingNote.extractedDeadlinesJson)
  };
}

function buildMeetingNoteCreateData(input: MeetingNoteInput): Prisma.MeetingNoteUncheckedCreateInput {
  return {
    projectId: toNullableString(input.projectId),
    title: input.title,
    meetingDate: new Date(input.meetingDate),
    attendeesJson: toJsonString(input.attendees),
    rawContent: input.rawContent,
    summary: toNullableString(input.summary ?? null),
    extractedActionsJson: toJsonString(input.extractedActions),
    extractedDecisionsJson: toJsonString(input.extractedDecisions),
    extractedRisksJson: toJsonString(input.extractedRisks),
    extractedDeadlinesJson: toJsonString(input.extractedDeadlines)
  };
}

function buildMeetingNoteUpdateData(input: MeetingNoteUpdateInput): Prisma.MeetingNoteUncheckedUpdateInput {
  return {
    ...(input.projectId !== undefined ? { projectId: toNullableString(input.projectId) } : {}),
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.meetingDate !== undefined ? { meetingDate: toMeetingDate(input.meetingDate) } : {}),
    ...(input.attendees !== undefined ? { attendeesJson: toJsonString(input.attendees) } : {}),
    ...(input.rawContent !== undefined ? { rawContent: input.rawContent } : {}),
    ...(input.summary !== undefined ? { summary: toNullableString(input.summary) } : {}),
    ...(input.extractedActions !== undefined ? { extractedActionsJson: toJsonString(input.extractedActions) } : {}),
    ...(input.extractedDecisions !== undefined ? { extractedDecisionsJson: toJsonString(input.extractedDecisions) } : {}),
    ...(input.extractedRisks !== undefined ? { extractedRisksJson: toJsonString(input.extractedRisks) } : {}),
    ...(input.extractedDeadlines !== undefined ? { extractedDeadlinesJson: toJsonString(input.extractedDeadlines) } : {})
  };
}

export async function listMeetingNotes(filters?: MeetingNoteFilters) {
  const validatedFilters = meetingNoteFilterSchema.parse(filters ?? {});
  const andClauses = [
    ...(validatedFilters.search
      ? [
          {
            OR: [
              { title: { contains: validatedFilters.search } },
              { rawContent: { contains: validatedFilters.search } },
              { summary: { contains: validatedFilters.search } }
            ]
          }
        ]
      : []),
    ...(validatedFilters.projectId ? [{ projectId: validatedFilters.projectId }] : [])
  ];
  const where = andClauses.length > 0 ? { AND: andClauses } : {};
  const meetingNotes = await prisma.meetingNote.findMany({
    where,
    include: {
      project: true
    },
    orderBy: [{ meetingDate: "desc" }, { createdAt: "desc" }]
  });

  return meetingNotes.map(hydrateMeetingNote);
}

export async function createMeetingNote(payload: MeetingNoteInput) {
  const validated = meetingNoteSchema.parse(payload);
  const meetingNote = await prisma.meetingNote.create({
    data: buildMeetingNoteCreateData(validated)
  });

  return hydrateMeetingNote(meetingNote);
}

export async function getMeetingNoteById(id: string) {
  const meetingNote = await prisma.meetingNote.findUnique({
    where: { id },
    include: {
      project: true
    }
  });

  return meetingNote ? hydrateMeetingNote(meetingNote) : null;
}

export async function updateMeetingNote(id: string, payload: MeetingNoteUpdateInput) {
  const validated = meetingNoteUpdateSchema.parse(payload);
  const meetingNote = await prisma.meetingNote.update({
    where: { id },
    data: buildMeetingNoteUpdateData(validated),
    include: {
      project: true
    }
  });

  return hydrateMeetingNote(meetingNote);
}

export async function deleteMeetingNote(id: string) {
  return prisma.meetingNote.delete({
    where: { id }
  });
}
