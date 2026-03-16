import { prisma } from "@/lib/db/prisma";
import { type IntakeModule } from "@/lib/ai/intake-schema";
import { analyzeIntakeText } from "@/lib/ai/intake-analyzer";
import { getAIProvider } from "@/lib/ai/provider-factory";
import { createAction } from "@/lib/services/action-service";
import { createBudgetItem } from "@/lib/services/budget-item-service";
import { createCommunication } from "@/lib/services/communication-service";
import { createContract } from "@/lib/services/contract-service";
import { createProject } from "@/lib/services/project-service";
import { createVendor } from "@/lib/services/vendor-service";
import {
  aiIntakeReviewQueueSchema,
  aiIntakeReviewResolveSchema,
  aiIntakeReviewUpdateSchema,
  type AIIntakeReviewQueueInput,
  type AIIntakeReviewResolveInput,
  type AIIntakeReviewStatus,
  type AIIntakeReviewUpdateInput
} from "@/lib/validation/ai-intake-review";
import { actionSchema } from "@/lib/validation/action";
import { budgetItemSchema } from "@/lib/validation/budget-item";
import { communicationSchema } from "@/lib/validation/communication";
import { contractSchema } from "@/lib/validation/contract";
import { projectSchema } from "@/lib/validation/project";
import { vendorSchema } from "@/lib/validation/vendor";

function parseJsonValue<T>(value?: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeOptionalString(value?: string | null) {
  return value?.trim() ? value.trim() : null;
}

function buildExcerpt(text: string) {
  return text.replace(/\r/g, "").replace(/[ \t]+/g, " ").trim().slice(0, 280);
}

function buildDefaultDraft(module: IntakeModule, rawText: string, summary?: string | null) {
  const excerpt = summary ?? buildExcerpt(rawText);

  if (module === "actions") {
    return {
      title: "",
      description: excerpt,
      dueDate: null,
      status: "TODO",
      priority: "NORMAL"
    };
  }

  if (module === "projects") {
    return {
      title: "",
      description: excerpt,
      type: "DEVELOPMENT",
      status: "DRAFT",
      priority: "NORMAL",
      startDate: null,
      targetDate: null
    };
  }

  if (module === "vendors") {
    return {
      name: "",
      category: "",
      mainContactName: "",
      mainContactEmail: "",
      notes: excerpt
    };
  }

  if (module === "contracts") {
    return {
      vendorId: "",
      projectId: "",
      title: "",
      contractType: "",
      status: "DRAFT",
      startDate: null,
      endDate: null,
      noticePeriodDays: null,
      amountPlanned: null,
      notes: excerpt,
      renewalType: "NONE"
    };
  }

  if (module === "budget") {
    return {
      title: "",
      category: "",
      projectId: "",
      contractId: "",
      vendorId: "",
      fiscalYear: null,
      plannedAmount: null,
      committedAmount: null,
      estimatedActualAmount: null,
      notes: excerpt
    };
  }

  return {
    title: "",
    type: "",
    status: "DRAFT",
    contentText: rawText,
    contentMarkdown: "",
    projectId: "",
    actionId: "",
    contractId: ""
  };
}

function buildHeuristicDraft(module: IntakeModule, rawText: string, sourceName?: string | null) {
  const decision = analyzeIntakeText(rawText, sourceName ?? null);
  const matchingCall = decision.toolCalls.find((toolCall) => {
    if (module === "actions") return toolCall.tool === "create_action";
    if (module === "projects") return toolCall.tool === "create_project";
    if (module === "vendors") return toolCall.tool === "create_vendor";
    if (module === "contracts") return toolCall.tool === "create_contract";
    if (module === "budget") return toolCall.tool === "create_budget_item";
    return toolCall.tool === "create_communication";
  });

  return matchingCall?.args ?? {};
}

function validateDraftData(module: IntakeModule, draftData: Record<string, unknown>) {
  if (module === "actions") {
    actionSchema.parse({
      title: draftData.title,
      description: draftData.description,
      status: draftData.status ?? "TODO",
      priority: draftData.priority ?? "NORMAL",
      dueDate: draftData.dueDate ?? null,
      projectId: draftData.projectId ?? null,
      contractId: draftData.contractId ?? null,
      vendorId: draftData.vendorId ?? null,
      sourceType: "AI_REVIEW",
      sourceRef: draftData.sourceRef ?? null
    });
    return;
  }

  if (module === "projects") {
    projectSchema.parse({
      title: draftData.title,
      description: draftData.description,
      type: draftData.type ?? "DEVELOPMENT",
      status: draftData.status ?? "DRAFT",
      priority: draftData.priority ?? "NORMAL",
      ownerId: draftData.ownerId ?? null,
      startDate: draftData.startDate ?? null,
      targetDate: draftData.targetDate ?? null
    });
    return;
  }

  if (module === "vendors") {
    vendorSchema.parse({
      name: draftData.name,
      category: draftData.category ?? null,
      mainContactName: draftData.mainContactName ?? null,
      mainContactEmail: draftData.mainContactEmail ?? null,
      notes: draftData.notes ?? null
    });
    return;
  }

  if (module === "contracts") {
    contractSchema.parse({
      vendorId: draftData.vendorId,
      projectId: draftData.projectId ?? null,
      title: draftData.title,
      contractType: draftData.contractType ?? null,
      status: draftData.status ?? "DRAFT",
      startDate: draftData.startDate ?? null,
      endDate: draftData.endDate ?? null,
      noticePeriodDays: draftData.noticePeriodDays ?? null,
      amountPlanned: draftData.amountPlanned ?? null,
      notes: draftData.notes ?? null,
      renewalType: draftData.renewalType ?? "NONE"
    });
    return;
  }

  if (module === "budget") {
    budgetItemSchema.parse({
      title: draftData.title,
      category: draftData.category ?? null,
      projectId: draftData.projectId ?? null,
      contractId: draftData.contractId ?? null,
      vendorId: draftData.vendorId ?? null,
      fiscalYear: draftData.fiscalYear ?? null,
      plannedAmount: draftData.plannedAmount ?? null,
      committedAmount: draftData.committedAmount ?? null,
      estimatedActualAmount: draftData.estimatedActualAmount ?? null,
      notes: draftData.notes ?? null
    });
    return;
  }

  communicationSchema.parse({
    title: draftData.title,
    type: draftData.type ?? null,
    status: draftData.status ?? "DRAFT",
    templateKey: draftData.templateKey ?? null,
    templateInputData: draftData.templateInputData ?? null,
    contentText: draftData.contentText ?? null,
    contentMarkdown: draftData.contentMarkdown ?? null,
    projectId: draftData.projectId ?? null,
    actionId: draftData.actionId ?? null,
    contractId: draftData.contractId ?? null
  });
}

async function createEntityFromReview(module: IntakeModule, draftData: Record<string, unknown>) {
  if (module === "actions") {
    const action = await createAction(actionSchema.parse({
      title: draftData.title,
      description: draftData.description,
      status: draftData.status ?? "TODO",
      priority: draftData.priority ?? "NORMAL",
      dueDate: draftData.dueDate ?? null,
      projectId: draftData.projectId ?? null,
      contractId: draftData.contractId ?? null,
      vendorId: draftData.vendorId ?? null,
      sourceType: "AI_REVIEW",
      sourceRef: draftData.sourceRef ?? null
    }));
    return { type: module, id: action.id, href: `/actions/${action.id}`, title: action.title };
  }

  if (module === "projects") {
    const project = await createProject(projectSchema.parse({
      title: draftData.title,
      description: draftData.description,
      type: draftData.type ?? "DEVELOPMENT",
      status: draftData.status ?? "DRAFT",
      priority: draftData.priority ?? "NORMAL",
      ownerId: draftData.ownerId ?? null,
      startDate: draftData.startDate ?? null,
      targetDate: draftData.targetDate ?? null
    }));
    return { type: module, id: project.id, href: `/projects/${project.id}`, title: project.title };
  }

  if (module === "vendors") {
    const vendor = await createVendor(vendorSchema.parse({
      name: draftData.name,
      category: draftData.category ?? null,
      mainContactName: draftData.mainContactName ?? null,
      mainContactEmail: draftData.mainContactEmail ?? null,
      notes: draftData.notes ?? null
    }));
    return { type: module, id: vendor.id, href: `/vendors/${vendor.id}`, title: vendor.name };
  }

  if (module === "contracts") {
    const contract = await createContract(contractSchema.parse({
      vendorId: draftData.vendorId,
      projectId: draftData.projectId ?? null,
      title: draftData.title,
      contractType: draftData.contractType ?? null,
      status: draftData.status ?? "DRAFT",
      startDate: draftData.startDate ?? null,
      endDate: draftData.endDate ?? null,
      noticePeriodDays: draftData.noticePeriodDays ?? null,
      amountPlanned: draftData.amountPlanned ?? null,
      notes: draftData.notes ?? null,
      renewalType: draftData.renewalType ?? "NONE"
    }));
    return { type: module, id: contract.id, href: `/contracts/${contract.id}`, title: contract.title };
  }

  if (module === "budget") {
    const budgetItem = await createBudgetItem(budgetItemSchema.parse({
      title: draftData.title,
      category: draftData.category ?? null,
      projectId: draftData.projectId ?? null,
      contractId: draftData.contractId ?? null,
      vendorId: draftData.vendorId ?? null,
      fiscalYear: draftData.fiscalYear ?? null,
      plannedAmount: draftData.plannedAmount ?? null,
      committedAmount: draftData.committedAmount ?? null,
      estimatedActualAmount: draftData.estimatedActualAmount ?? null,
      notes: draftData.notes ?? null
    }));
    return { type: module, id: budgetItem.id, href: `/budget/${budgetItem.id}`, title: budgetItem.title };
  }

  const communication = await createCommunication(communicationSchema.parse({
    title: draftData.title,
    type: draftData.type ?? null,
    status: draftData.status ?? "DRAFT",
    templateKey: draftData.templateKey ?? null,
    templateInputData: draftData.templateInputData ?? null,
    contentText: draftData.contentText ?? null,
    contentMarkdown: draftData.contentMarkdown ?? null,
    projectId: draftData.projectId ?? null,
    actionId: draftData.actionId ?? null,
    contractId: draftData.contractId ?? null
  }));
  return { type: module, id: communication.id, href: `/communications/${communication.id}`, title: communication.title };
}

function mapReview(record: {
  id: string;
  sourceName: string | null;
  rawText: string;
  providerMode: string;
  providerLabel: string;
  providerModel: string;
  summary: string | null;
  suggestedModulesJson: string | null;
  analysisJson: string | null;
  status: string;
  reviewReason: string | null;
  selectedModule: string | null;
  draftDataJson: string | null;
  createdEntityType: string | null;
  createdEntityId: string | null;
  createdEntityHref: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...record,
    suggestedModules: parseJsonValue<IntakeModule[]>(record.suggestedModulesJson) ?? [],
    analysis: parseJsonValue<Record<string, unknown>>(record.analysisJson),
    draftData: parseJsonValue<Record<string, unknown>>(record.draftDataJson)
  };
}

export async function queueAIIntakeReview(payload: AIIntakeReviewQueueInput) {
  const validated = aiIntakeReviewQueueSchema.parse(payload);
  const record = await prisma.aIIntakeReview.create({
    data: {
      sourceName: normalizeOptionalString(validated.sourceName),
      rawText: validated.rawText,
      providerMode: validated.providerMode,
      providerLabel: validated.providerLabel,
      providerModel: validated.providerModel,
      summary: normalizeOptionalString(validated.summary),
      suggestedModulesJson: JSON.stringify(validated.suggestedModules),
      analysisJson: validated.analysis ? JSON.stringify(validated.analysis) : null,
      reviewReason: normalizeOptionalString(validated.reviewReason)
    }
  });

  return mapReview(record);
}

export async function countPendingAIIntakeReviews() {
  return prisma.aIIntakeReview.count({
    where: { status: "PENDING" }
  });
}

export async function listAIIntakeReviews(status?: AIIntakeReviewStatus) {
  const records = await prisma.aIIntakeReview.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }]
  });

  return records.map(mapReview);
}

export async function getAIIntakeReviewById(id: string) {
  const record = await prisma.aIIntakeReview.findUnique({
    where: { id }
  });

  return record ? mapReview(record) : null;
}

export async function updateAIIntakeReview(id: string, payload: AIIntakeReviewUpdateInput) {
  const validated = aiIntakeReviewUpdateSchema.parse(payload);

  const record = await prisma.aIIntakeReview.update({
    where: { id },
    data: {
      selectedModule: validated.selectedModule,
      draftDataJson: JSON.stringify(validated.draftData)
    }
  });

  return mapReview(record);
}

export async function suggestAIIntakeReviewDraft(id: string, selectedModule: IntakeModule) {
  const review = await getAIIntakeReviewById(id);

  if (!review) {
    throw new Error("Demande de revue introuvable.");
  }

  const provider = getAIProvider();
  const defaultDraft = buildDefaultDraft(selectedModule, review.rawText, review.summary);
  const heuristicDraft = buildHeuristicDraft(selectedModule, review.rawText, review.sourceName);

  let suggestedDraft: Record<string, unknown> = {};
  let suggestionError: string | null = null;

  try {
    suggestedDraft = await provider.suggestDraft(selectedModule, {
      text: review.rawText,
      context: {
        sourceName: review.sourceName ?? "",
        reviewSummary: review.summary ?? ""
      }
    });
  } catch (error) {
    suggestionError = (error as Error).message;
  }

  const draftData = {
    ...defaultDraft,
    ...heuristicDraft,
    ...suggestedDraft
  };

  const record = await prisma.aIIntakeReview.update({
    where: { id },
    data: {
      selectedModule,
      draftDataJson: JSON.stringify(draftData)
    }
  });

  return {
    review: mapReview(record),
    suggestion: {
      provider: provider.info,
      usedFallback: Object.keys(suggestedDraft).length === 0,
      message: suggestionError
        ? `Suggestion IA indisponible, brouillon complété avec le fallback local: ${suggestionError}`
        : "Champs proposés par l’IA pour le module sélectionné."
    }
  };
}

export async function resolveAIIntakeReview(id: string, payload: AIIntakeReviewResolveInput) {
  const validated = aiIntakeReviewResolveSchema.parse(payload);

  if (validated.action === "reject") {
    const record = await prisma.aIIntakeReview.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewedAt: new Date()
      }
    });

    return { review: mapReview(record), created: null };
  }

  if (!validated.selectedModule || !validated.draftData) {
    throw new Error("Le module et les champs saisis sont requis pour valider la demande.");
  }

  const created = await createEntityFromReview(validated.selectedModule, validated.draftData);
  const record = await prisma.aIIntakeReview.update({
    where: { id },
    data: {
      status: "APPROVED",
      selectedModule: validated.selectedModule,
      draftDataJson: JSON.stringify(validated.draftData),
      createdEntityType: created.type,
      createdEntityId: created.id,
      createdEntityHref: created.href,
      reviewedAt: new Date()
    }
  });

  return { review: mapReview(record), created };
}
