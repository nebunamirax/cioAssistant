import { type Prisma } from "@prisma/client";
import {
  renderCommunicationTemplate,
  sanitizeTemplateInputData,
  type CommunicationTemplateKey
} from "@/lib/communications/templates";
import { prisma } from "@/lib/db/prisma";
import {
  communicationFilterSchema,
  communicationSchema,
  communicationUpdateSchema,
  type CommunicationFilters,
  type CommunicationInput,
  type CommunicationUpdateInput
} from "@/lib/validation/communication";

function normalizeOptionalString(value?: string | null) {
  if (value === undefined) return undefined;
  return value === "" ? null : value;
}

function parseInputDataJson(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as Record<string, string>;
  } catch {
    return null;
  }
}

async function buildTemplateContext(input: {
  projectId?: string | null;
  actionId?: string | null;
  contractId?: string | null;
}, db: Prisma.TransactionClient) {
  const [project, action, contract] = await Promise.all([
    input.projectId ? db.project.findUnique({ where: { id: input.projectId }, select: { title: true } }) : null,
    input.actionId ? db.action.findUnique({ where: { id: input.actionId }, select: { title: true } }) : null,
    input.contractId ? db.contract.findUnique({ where: { id: input.contractId }, select: { title: true } }) : null
  ]);

  return {
    projectTitle: project?.title,
    actionTitle: action?.title,
    contractTitle: contract?.title
  };
}

async function enrichGeneratedContent(input: CommunicationInput | CommunicationUpdateInput, db: Prisma.TransactionClient) {
  const templateKey = input.templateKey ?? undefined;
  const templateInputData = sanitizeTemplateInputData(input.templateInputData);

  if (!templateKey) {
    return {
      title: input.title,
      type: input.type,
      contentText: input.contentText,
      contentMarkdown: input.contentMarkdown,
      templateKey: undefined,
      inputDataJson: input.templateInputData !== undefined ? JSON.stringify(templateInputData) : undefined
    };
  }

  const context = await buildTemplateContext({
    projectId: input.projectId ?? null,
    actionId: input.actionId ?? null,
    contractId: input.contractId ?? null
  }, db);
  const generated = renderCommunicationTemplate(templateKey as CommunicationTemplateKey, templateInputData, context);

  return {
    title: input.title || generated.title,
    type: input.type || generated.type,
    contentText: input.contentText || generated.contentText,
    contentMarkdown: input.contentMarkdown || generated.contentMarkdown,
    templateKey,
    inputDataJson: JSON.stringify(templateInputData)
  };
}

async function buildCommunicationCreateDataAsync(input: CommunicationInput, db: Prisma.TransactionClient): Promise<Prisma.CommunicationUncheckedCreateInput> {
  const generated = await enrichGeneratedContent(input, db);

  return {
    title: generated.title ?? input.title ?? "",
    ...(generated.type !== undefined ? { type: normalizeOptionalString(generated.type) } : {}),
    status: input.status,
    ...(generated.templateKey !== undefined ? { templateKey: normalizeOptionalString(generated.templateKey) } : {}),
    ...(generated.inputDataJson !== undefined ? { inputDataJson: normalizeOptionalString(generated.inputDataJson) } : {}),
    ...(generated.contentText !== undefined ? { contentText: normalizeOptionalString(generated.contentText) } : {}),
    ...(generated.contentMarkdown !== undefined ? { contentMarkdown: normalizeOptionalString(generated.contentMarkdown) } : {}),
    ...(input.projectId !== undefined ? { projectId: normalizeOptionalString(input.projectId) } : {}),
    ...(input.actionId !== undefined ? { actionId: normalizeOptionalString(input.actionId) } : {}),
    ...(input.contractId !== undefined ? { contractId: normalizeOptionalString(input.contractId) } : {})
  };
}

async function buildCommunicationUpdateDataAsync(input: CommunicationUpdateInput, db: Prisma.TransactionClient): Promise<Prisma.CommunicationUncheckedUpdateInput> {
  const generated = await enrichGeneratedContent(input, db);

  return {
    ...(input.title !== undefined || generated.templateKey !== undefined ? { title: generated.title ?? input.title ?? "" } : {}),
    ...(input.type !== undefined || generated.templateKey !== undefined ? { type: normalizeOptionalString(generated.type) } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.templateKey !== undefined ? { templateKey: normalizeOptionalString(generated.templateKey) } : {}),
    ...(input.templateInputData !== undefined ? { inputDataJson: normalizeOptionalString(generated.inputDataJson) } : {}),
    ...(input.contentText !== undefined || generated.templateKey !== undefined
      ? { contentText: normalizeOptionalString(generated.contentText) }
      : {}),
    ...(input.contentMarkdown !== undefined || generated.templateKey !== undefined
      ? { contentMarkdown: normalizeOptionalString(generated.contentMarkdown) }
      : {}),
    ...(input.projectId !== undefined ? { projectId: normalizeOptionalString(input.projectId) } : {}),
    ...(input.actionId !== undefined ? { actionId: normalizeOptionalString(input.actionId) } : {}),
    ...(input.contractId !== undefined ? { contractId: normalizeOptionalString(input.contractId) } : {})
  };
}

function mapCommunicationRecord<
  T extends {
    inputDataJson?: string | null;
    templateKey?: string | null;
  }
>(record: T) {
  return {
    ...record,
    templateInputData: parseInputDataJson(record.inputDataJson)
  };
}

export async function listCommunications(filters?: CommunicationFilters) {
  const validatedFilters = communicationFilterSchema.parse(filters ?? {});
  const andClauses = [
    ...(validatedFilters.search
      ? [
          {
            OR: [
              { title: { contains: validatedFilters.search } },
              { contentText: { contains: validatedFilters.search } },
              { contentMarkdown: { contains: validatedFilters.search } }
            ]
          }
        ]
      : []),
    ...(validatedFilters.status ? [{ status: validatedFilters.status }] : []),
    ...(validatedFilters.type ? [{ type: { contains: validatedFilters.type } }] : []),
    ...(validatedFilters.projectId ? [{ projectId: validatedFilters.projectId }] : []),
    ...(validatedFilters.actionId ? [{ actionId: validatedFilters.actionId }] : []),
    ...(validatedFilters.contractId ? [{ contractId: validatedFilters.contractId }] : [])
  ];
  const where = andClauses.length > 0 ? { AND: andClauses } : {};

  const records = await prisma.communication.findMany({
    where,
    include: {
      project: true,
      action: true,
      contract: true
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
  });

  return records.map(mapCommunicationRecord);
}

export async function createCommunication(payload: CommunicationInput, db: Prisma.TransactionClient = prisma) {
  const validated = communicationSchema.parse(payload);
  const record = await db.communication.create({
    data: await buildCommunicationCreateDataAsync(validated, db)
  });

  return mapCommunicationRecord(record);
}

export async function getCommunicationById(id: string) {
  const record = await prisma.communication.findUnique({
    where: { id },
    include: {
      project: true,
      action: true,
      contract: true
    }
  });

  return record ? mapCommunicationRecord(record) : null;
}

export async function updateCommunication(id: string, payload: CommunicationUpdateInput, db: Prisma.TransactionClient = prisma) {
  const validated = communicationUpdateSchema.parse(payload);
  const record = await db.communication.update({
    where: { id },
    data: await buildCommunicationUpdateDataAsync(validated, db)
  });

  return mapCommunicationRecord(record);
}

export async function deleteCommunication(id: string) {
  return prisma.communication.delete({
    where: { id }
  });
}
