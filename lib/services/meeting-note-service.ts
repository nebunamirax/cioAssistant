import { type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createAction } from "@/lib/services/action-service";
import {
  meetingNoteFilterSchema,
  meetingNoteSchema,
  meetingNoteUpdateSchema,
  type MeetingActionDraftInput,
  type MeetingNoteFilters,
  type MeetingNoteInput,
  type MeetingNoteUpdateInput
} from "@/lib/validation/meeting-note";

function toNullableString(value?: string | null) {
  if (value === undefined) return undefined;
  return value?.trim() ? value : null;
}

function toJsonString(values?: unknown[]) {
  if (values === undefined) return undefined;
  return JSON.stringify(values);
}

function parseStringArrayJson(value?: string | null) {
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

function parseMeetingActionDrafts(value?: string | null): MeetingActionDraftInput[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((item): MeetingActionDraftInput[] => {
      if (typeof item === "string") {
        const title = item.trim();
        return title ? [{ title, ownerName: null, dueDate: null, notes: item, createdActionId: null }] : [];
      }

      if (!item || typeof item !== "object" || typeof item.title !== "string") {
        return [];
      }

      return [{
        title: item.title,
        ownerName: typeof item.ownerName === "string" ? item.ownerName : null,
        dueDate: typeof item.dueDate === "string" ? item.dueDate : null,
        notes: typeof item.notes === "string" ? item.notes : null,
        createdActionId: typeof item.createdActionId === "string" ? item.createdActionId : null
      }];
    });
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
    attendees: parseStringArrayJson(meetingNote.attendeesJson),
    extractedActions: parseMeetingActionDrafts(meetingNote.extractedActionsJson),
    extractedDecisions: parseStringArrayJson(meetingNote.extractedDecisionsJson),
    extractedRisks: parseStringArrayJson(meetingNote.extractedRisksJson),
    extractedDeadlines: parseStringArrayJson(meetingNote.extractedDeadlinesJson)
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

export async function createActionsFromMeetingNote(id: string) {
  const meetingNote = await getMeetingNoteById(id);

  if (!meetingNote) {
    throw new Error("Meeting note not found");
  }

  const draftActions = meetingNote.extractedActions.filter((action) => !action.createdActionId && action.title.trim().length >= 3);
  const createdActions: Awaited<ReturnType<typeof createAction>>[] = [];

  for (const draft of draftActions) {
    const created = await createAction({
      title: draft.title,
      description: draft.notes ?? meetingNote.summary ?? meetingNote.rawContent,
      ownerName: draft.ownerName ?? null,
      dueDate: draft.dueDate ?? null,
      status: "TODO",
      priority: "NORMAL",
      projectId: meetingNote.projectId ?? null,
      sourceType: "MEETING_NOTE",
      sourceRef: `meeting-note:${meetingNote.id}`
    });

    createdActions.push(created);
  }

  if (createdActions.length === 0) {
    return {
      meetingNote,
      createdActions: []
    };
  }

  const updatedDrafts = meetingNote.extractedActions.map((draft) => {
    const matched = createdActions.find((action) => action.title === draft.title && !draft.createdActionId);
    return matched ? { ...draft, createdActionId: matched.id } : draft;
  });

  const updatedMeetingNote = await updateMeetingNote(id, {
    extractedActions: updatedDrafts
  });

  return {
    meetingNote: updatedMeetingNote,
    createdActions
  };
}
