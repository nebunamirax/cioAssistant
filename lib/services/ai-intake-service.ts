import {
  type IntakeDecision,
  type IntakeExecutionPlan,
  type IntakeModule,
  type IntakeToolCall,
  toolToModule
} from "@/lib/ai/intake-schema";
import { analyzeIntakeText } from "@/lib/ai/intake-analyzer";
import { prisma } from "@/lib/db/prisma";
import { getAIProvider } from "@/lib/ai/provider-factory";
import { queueAIIntakeReview } from "@/lib/services/ai-intake-review-service";
import { createAction } from "@/lib/services/action-service";
import { createBudgetItem } from "@/lib/services/budget-item-service";
import { createCommunication } from "@/lib/services/communication-service";
import { createContract } from "@/lib/services/contract-service";
import { createProject } from "@/lib/services/project-service";
import { createVendor } from "@/lib/services/vendor-service";
import { aiIntakeSchema, type AIIntakeInput } from "@/lib/validation/ai-intake";
import { z } from "zod";

type CreatedRecord = {
  module: IntakeModule;
  id: string;
  title: string;
  href: string;
};

type ProviderInfo = {
  provider: string;
  label: string;
  mode: string;
  model: string;
  location: "local" | "cloud";
};

type CreatedContext = {
  vendorId: string | null;
  projectId: string | null;
  contractId: string | null;
  stepRefs: Map<string, { module: IntakeModule; id: string }>;
};

type ProjectCandidate = {
  id: string;
  title: string;
  status: string;
  priority: string;
};

export type AIIntakeCreatedResult = {
  disposition: "created";
  sourceName: string | null;
  provider: ProviderInfo;
  summary: string;
  modules: IntakeModule[];
  created: CreatedRecord[];
};

export type AIIntakeReviewResult = {
  disposition: "review";
  sourceName: string | null;
  provider: ProviderInfo;
  summary: string;
  modules: IntakeModule[];
  reviewId: string;
  reviewReason: string;
  selectedModule: IntakeModule;
};

export type AIIntakeResult = AIIntakeCreatedResult | AIIntakeReviewResult;

function buildSourceReference(sourceName?: string | null) {
  return sourceName?.trim() ? `ai-intake:${sourceName.trim()}` : "ai-intake";
}

function buildExcerpt(text: string) {
  return text.trim().slice(0, 500);
}

function buildToolCallFromDraft(module: IntakeModule, draft: Record<string, unknown>): IntakeToolCall | null {
  if (module === "actions" && typeof draft.title === "string" && draft.title.trim().length >= 3) {
    return {
      tool: "create_action",
      args: {
        title: draft.title.trim(),
        description: typeof draft.description === "string" ? draft.description : undefined,
        dueDate: typeof draft.dueDate === "string" ? draft.dueDate : null,
        status: typeof draft.status === "string" ? draft.status : undefined,
        priority: typeof draft.priority === "string" ? draft.priority : undefined,
        projectId: typeof draft.projectId === "string" ? draft.projectId : null,
        contractId: typeof draft.contractId === "string" ? draft.contractId : null,
        vendorId: typeof draft.vendorId === "string" ? draft.vendorId : null
      }
    };
  }

  if (module === "projects" && typeof draft.title === "string" && draft.title.trim().length >= 3) {
    return {
      tool: "create_project",
      args: {
        title: draft.title.trim(),
        description: typeof draft.description === "string" ? draft.description : undefined,
        type: typeof draft.type === "string" ? draft.type as "DEVELOPMENT" : "DEVELOPMENT",
        status: typeof draft.status === "string" ? draft.status : undefined,
        priority: typeof draft.priority === "string" ? draft.priority : undefined,
        ownerId: typeof draft.ownerId === "string" ? draft.ownerId : null,
        startDate: typeof draft.startDate === "string" ? draft.startDate : null,
        targetDate: typeof draft.targetDate === "string" ? draft.targetDate : null
      }
    };
  }

  if (module === "vendors" && typeof draft.name === "string" && draft.name.trim().length >= 2) {
    return {
      tool: "create_vendor",
      args: {
        name: draft.name.trim(),
        category: typeof draft.category === "string" ? draft.category : undefined,
        mainContactName: typeof draft.mainContactName === "string" ? draft.mainContactName : undefined,
        mainContactEmail: typeof draft.mainContactEmail === "string" ? draft.mainContactEmail : undefined,
        notes: typeof draft.notes === "string" ? draft.notes : undefined
      }
    };
  }

  if (module === "contracts" && typeof draft.title === "string" && draft.title.trim().length >= 3) {
    return {
      tool: "create_contract",
      args: {
        vendorId: typeof draft.vendorId === "string" ? draft.vendorId : null,
        projectId: typeof draft.projectId === "string" ? draft.projectId : null,
        title: draft.title.trim(),
        contractType: typeof draft.contractType === "string" ? draft.contractType : undefined,
        status: typeof draft.status === "string" ? draft.status : undefined,
        startDate: typeof draft.startDate === "string" ? draft.startDate : null,
        endDate: typeof draft.endDate === "string" ? draft.endDate : null,
        noticePeriodDays: typeof draft.noticePeriodDays === "number" ? draft.noticePeriodDays : null,
        amountPlanned: typeof draft.amountPlanned === "number" ? draft.amountPlanned : null,
        notes: typeof draft.notes === "string" ? draft.notes : undefined,
        renewalType: typeof draft.renewalType === "string" ? draft.renewalType : undefined
      }
    };
  }

  if (module === "budget" && typeof draft.title === "string" && draft.title.trim().length >= 3) {
    return {
      tool: "create_budget_item",
      args: {
        title: draft.title.trim(),
        category: typeof draft.category === "string" ? draft.category : undefined,
        projectId: typeof draft.projectId === "string" ? draft.projectId : null,
        contractId: typeof draft.contractId === "string" ? draft.contractId : null,
        vendorId: typeof draft.vendorId === "string" ? draft.vendorId : null,
        plannedAmount: typeof draft.plannedAmount === "number" ? draft.plannedAmount : undefined,
        committedAmount: typeof draft.committedAmount === "number" ? draft.committedAmount : null,
        estimatedActualAmount: typeof draft.estimatedActualAmount === "number" ? draft.estimatedActualAmount : null,
        fiscalYear: typeof draft.fiscalYear === "number" ? draft.fiscalYear : undefined,
        notes: typeof draft.notes === "string" ? draft.notes : undefined
      }
    };
  }

  if (module === "communications" && typeof draft.title === "string" && typeof draft.contentText === "string") {
    return {
      tool: "create_communication",
      args: {
        title: draft.title.trim(),
        type: typeof draft.type === "string" ? draft.type : undefined,
        status: typeof draft.status === "string" ? draft.status : undefined,
        contentText: draft.contentText,
        contentMarkdown: typeof draft.contentMarkdown === "string" ? draft.contentMarkdown : undefined,
        projectId: typeof draft.projectId === "string" ? draft.projectId : null,
        actionId: typeof draft.actionId === "string" ? draft.actionId : null,
        contractId: typeof draft.contractId === "string" ? draft.contractId : null
      }
    };
  }

  return null;
}

function normalizeComparableText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSearchTerms(text: string) {
  const normalized = normalizeComparableText(text);
  const quotedTerms = Array.from(text.matchAll(/"([^"]+)"/g)).map((match) => normalizeComparableText(match[1]));
  const projectLabelMatches = Array.from(normalized.matchAll(/\b(?:projet|project)\s+([a-z0-9][a-z0-9\s-]{1,80})/g)).map((match) => match[1].trim());
  const keywords = normalized
    .split(" ")
    .filter((token) => token.length >= 4)
    .filter((token) => !["create", "creer", "creer", "ajoute", "action", "projet", "project", "avec", "pour", "this", "that"].includes(token));

  return Array.from(new Set([...quotedTerms, ...projectLabelMatches, ...keywords])).filter(Boolean);
}

async function getProjectCandidatesForIntake(text: string) {
  const searchTerms = extractSearchTerms(text).slice(0, 8);
  const where = searchTerms.length > 0
    ? {
        OR: searchTerms.flatMap((term) => [
          { title: { contains: term } },
          { description: { contains: term } }
        ])
      }
    : undefined;

  const projects = await prisma.project.findMany({
    where,
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      description: true
    },
    take: 8,
    orderBy: [{ updatedAt: "desc" }]
  });

  const normalizedText = normalizeComparableText(text);
  const scored = projects.map((project) => {
    const normalizedTitle = normalizeComparableText(project.title);
    const exactMention = normalizedTitle.length > 0 && normalizedText.includes(normalizedTitle);
    const tokenOverlap = searchTerms.filter((term) => normalizedTitle.includes(term) || term.includes(normalizedTitle)).length;

    return {
      id: project.id,
      title: project.title,
      status: project.status,
      priority: project.priority,
      score: (exactMention ? 10 : 0) + tokenOverlap
    };
  });

  return scored
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .slice(0, 5)
    .map(({ id, title, status, priority }) => ({ id, title, status, priority })) satisfies ProjectCandidate[];
}

function resolveExistingProjectId(text: string, candidates: ProjectCandidate[]) {
  if (candidates.length === 0) {
    return null;
  }

  const normalizedText = normalizeComparableText(text);
  const matches = candidates.filter((candidate) => {
    const normalizedTitle = normalizeComparableText(candidate.title);
    return normalizedTitle.length > 0 && normalizedText.includes(normalizedTitle);
  });

  if (matches.length === 1) {
    return matches[0].id;
  }

  return null;
}

function hasProjectCreationIntent(text: string) {
  return /\b(cree|créer|creer|ouvre|ouvrir|lance|lancer|ajoute|ajouter)\b(?:\s+(?:un|une|le|la|ce|cet|cette))?\s+\b(projet|project|programme|initiative)\b/i.test(text)
    || /(?:^|\n)\s*(projet|project|programme|initiative)\s*[:\-]/i.test(text);
}

function attachExistingProjectContext(decision: IntakeDecision, text: string, candidates: ProjectCandidate[]) {
  if (candidates.length === 0) {
    return decision;
  }

  const resolvedProjectId = resolveExistingProjectId(text, candidates);
  if (!resolvedProjectId) {
    return decision;
  }

  return {
    ...decision,
    toolCalls: decision.toolCalls.flatMap((toolCall) => {
      if (toolCall.tool === "create_project" && !hasProjectCreationIntent(text)) {
        return [];
      }

      if (toolCall.tool === "create_action" && !toolCall.args.projectId) {
        return {
          ...toolCall,
          args: {
            ...toolCall.args,
            projectId: resolvedProjectId
          }
        };
      }

      if (toolCall.tool === "create_contract" && !toolCall.args.projectId) {
        return {
          ...toolCall,
          args: {
            ...toolCall.args,
            projectId: resolvedProjectId
          }
        };
      }

      if (toolCall.tool === "create_budget_item" && !toolCall.args.projectId) {
        return {
          ...toolCall,
          args: {
            ...toolCall.args,
            projectId: resolvedProjectId
          }
        };
      }

      if (toolCall.tool === "create_communication" && !toolCall.args.projectId) {
        return {
          ...toolCall,
          args: {
            ...toolCall.args,
            projectId: resolvedProjectId
          }
        };
      }

      return toolCall;
    })
  };
}

function formatIntakeError(error: unknown) {
  if (error instanceof z.ZodError) {
    const primaryModuleIssue = error.issues.find((issue) => issue.path.join(".") === "primaryModule");
    if (primaryModuleIssue) {
      return "Le modèle n’a pas choisi de module principal exploitable. La demande part en revue manuelle.";
    }

    const firstIssue = error.issues[0];
    if (firstIssue) {
      const path = firstIssue.path.length > 0 ? firstIssue.path.join(".") : "racine";
      return `La réponse IA n’est pas encore exploitable sur le champ ${path}. La demande part en revue manuelle.`;
    }
  }

  return (error as Error).message;
}

function modulesFromToolCalls(toolCalls: IntakeToolCall[]) {
  return Array.from(new Set(toolCalls.map((toolCall) => toolToModule(toolCall.tool))));
}

function isGenericActionTitle(value: string) {
  const title = value.trim().toLowerCase();
  return title.length < 4 || title.startsWith("task ") || title.startsWith("todo") || title.startsWith("action ");
}

function reviewReasonForDecision(decision: IntakeDecision) {
  if (decision.reviewRecommended) {
    return decision.reviewReason ?? "Le modèle recommande une revue manuelle.";
  }

  if (decision.routingConfidence < 0.6) {
    return decision.reviewReason ?? "Le niveau de confiance du routage IA est trop faible pour créer automatiquement l’entrée.";
  }

  if (decision.toolCalls.length === 0) {
    return "Aucun module clair n’a été reconnu automatiquement.";
  }

  const genericActionCall = decision.toolCalls.find(
    (toolCall) => toolCall.tool === "create_action" && isGenericActionTitle(toolCall.args.title)
  );
  if (genericActionCall) {
    return "La demande ressemble à une action, mais le titre proposé reste trop générique pour une création automatique.";
  }

  return null;
}

function buildReviewDraft(decision: IntakeDecision, sourceText: string): {
  selectedModule: IntakeModule;
  draftData: Record<string, unknown>;
} {
  const primaryModule = decision.primaryModule
    ?? (decision.toolCalls[0] ? toolToModule(decision.toolCalls[0].tool) : undefined);
  const primaryCall = primaryModule
    ? decision.toolCalls.find((toolCall) => toolToModule(toolCall.tool) === primaryModule)
    : decision.toolCalls[0];

  if (primaryCall?.tool === "create_action") {
    return { selectedModule: "actions", draftData: primaryCall.args };
  }

  if (primaryCall?.tool === "create_project") {
    return { selectedModule: "projects", draftData: primaryCall.args };
  }

  if (primaryCall?.tool === "create_vendor") {
    return { selectedModule: "vendors", draftData: primaryCall.args };
  }

  if (primaryCall?.tool === "create_contract") {
    return { selectedModule: "contracts", draftData: primaryCall.args };
  }

  if (primaryCall?.tool === "create_budget_item") {
    return { selectedModule: "budget", draftData: primaryCall.args };
  }

  if (primaryCall?.tool === "create_communication") {
    return { selectedModule: "communications", draftData: primaryCall.args };
  }

  return {
    selectedModule: primaryModule ?? "actions",
    draftData:
      primaryModule === "projects"
        ? { title: "", description: buildExcerpt(sourceText), type: "DEVELOPMENT", status: "DRAFT", priority: "NORMAL" }
        : primaryModule === "vendors"
          ? { name: "", category: "", mainContactEmail: "", notes: buildExcerpt(sourceText) }
          : primaryModule === "contracts"
            ? { title: "", contractType: "", status: "DRAFT", renewalType: "NONE", notes: buildExcerpt(sourceText) }
            : primaryModule === "budget"
              ? { title: "", category: "", plannedAmount: null, fiscalYear: null, notes: buildExcerpt(sourceText) }
              : primaryModule === "communications"
                ? { title: "", type: "", contentText: sourceText, status: "DRAFT" }
                : { title: "", description: buildExcerpt(sourceText), dueDate: null, status: "TODO", priority: "NORMAL" }
  };
}

async function queueReviewFromDecision(args: {
  sourceName?: string | null;
  text: string;
  provider: ProviderInfo;
  decision?: IntakeDecision | null;
  reviewReason: string;
}) {
  const fallbackDecision: IntakeDecision = args.decision ?? {
    summary: buildExcerpt(args.text),
    primaryModule: undefined,
    routingConfidence: 0,
    reviewRecommended: true,
    reviewReason: args.reviewReason,
    toolCalls: []
  };
  const heuristicDecision = analyzeIntakeText(args.text, args.sourceName ?? null);
  const decisionForDraft = fallbackDecision.toolCalls.length > 0 ? fallbackDecision : heuristicDecision;
  const reviewDraft = buildReviewDraft(decisionForDraft, args.text);
  const review = await queueAIIntakeReview({
    sourceName: args.sourceName ?? null,
    rawText: args.text,
    providerMode: args.provider.mode,
    providerLabel: args.provider.label,
    providerModel: args.provider.model,
    summary: fallbackDecision.summary,
    suggestedModules: modulesFromToolCalls(fallbackDecision.toolCalls),
    analysis: fallbackDecision as unknown as Record<string, unknown>,
    reviewReason: args.reviewReason
  });

  await prisma.aIIntakeReview.update({
    where: { id: review.id },
    data: {
      selectedModule: reviewDraft.selectedModule,
      draftDataJson: JSON.stringify(reviewDraft.draftData)
    }
  });

  return {
    disposition: "review",
    sourceName: args.sourceName ?? null,
    provider: args.provider,
    summary: fallbackDecision.summary,
    modules: modulesFromToolCalls(fallbackDecision.toolCalls),
    reviewId: review.id,
    reviewReason: args.reviewReason,
    selectedModule: reviewDraft.selectedModule
  } satisfies AIIntakeReviewResult;
}

async function ensureVendor(toolCall: Extract<IntakeToolCall, { tool: "create_vendor" }>, created: CreatedContext, records: CreatedRecord[]) {
  const existingVendor = await prisma.vendor.findFirst({
    where: { name: toolCall.args.name }
  });

  if (existingVendor) {
    created.vendorId = existingVendor.id;
    return;
  }

  const vendor = await createVendor({
    name: toolCall.args.name,
    category: toolCall.args.category,
    mainContactName: toolCall.args.mainContactName,
    mainContactEmail: toolCall.args.mainContactEmail,
    notes: toolCall.args.notes
  });
  created.vendorId = vendor.id;
  records.push({ module: "vendors", id: vendor.id, title: vendor.name, href: `/vendors/${vendor.id}` });
}

async function ensureProject(toolCall: Extract<IntakeToolCall, { tool: "create_project" }>, created: CreatedContext, records: CreatedRecord[]) {
  const existingProject = await prisma.project.findFirst({
    where: { title: toolCall.args.title }
  });

  if (existingProject) {
    created.projectId = existingProject.id;
    return;
  }

  const project = await createProject({
    title: toolCall.args.title,
    description: toolCall.args.description,
    type: toolCall.args.type,
    status: toolCall.args.status === "ACTIVE" || toolCall.args.status === "ON_HOLD" || toolCall.args.status === "COMPLETED" || toolCall.args.status === "CANCELLED"
      ? toolCall.args.status
      : "DRAFT",
    priority: toolCall.args.priority === "LOW" || toolCall.args.priority === "HIGH" || toolCall.args.priority === "CRITICAL"
      ? toolCall.args.priority
      : "NORMAL",
    ownerId: toolCall.args.ownerId,
    startDate: toolCall.args.startDate ?? null,
    targetDate: toolCall.args.targetDate ?? null
  });
  created.projectId = project.id;
  records.push({ module: "projects", id: project.id, title: project.title, href: `/projects/${project.id}` });
}

async function executeToolCall(toolCall: IntakeToolCall, context: {
  created: CreatedContext;
  records: CreatedRecord[];
  sourceRef: string;
  sourceText: string;
}) {
  if (toolCall.tool === "create_vendor") {
    await ensureVendor(toolCall, context.created, context.records);
    return;
  }

  if (toolCall.tool === "create_project") {
    await ensureProject(toolCall, context.created, context.records);
    return;
  }

  if (toolCall.tool === "create_contract") {
    const vendorId = toolCall.args.vendorId ?? context.created.vendorId;
    if (!vendorId) {
      throw new Error("Impossible de créer le contrat automatiquement sans vendorId.");
    }

    const existingContract = await prisma.contract.findFirst({
      where: { title: toolCall.args.title }
    });
    if (existingContract) {
      context.created.contractId = existingContract.id;
      return;
    }

    const contract = await createContract({
      vendorId,
      projectId: toolCall.args.projectId ?? context.created.projectId,
      title: toolCall.args.title,
      contractType: toolCall.args.contractType,
      status: toolCall.args.status === "ACTIVE" || toolCall.args.status === "EXPIRED" || toolCall.args.status === "TERMINATED"
        ? toolCall.args.status
        : "DRAFT",
      startDate: toolCall.args.startDate ?? null,
      endDate: toolCall.args.endDate ?? null,
      noticePeriodDays: toolCall.args.noticePeriodDays ?? null,
      amountPlanned: toolCall.args.amountPlanned ?? null,
      notes: toolCall.args.notes,
      renewalType: toolCall.args.renewalType === "AUTO" || toolCall.args.renewalType === "MANUAL" ? toolCall.args.renewalType : "NONE"
    });
    context.created.contractId = contract.id;
    context.records.push({ module: "contracts", id: contract.id, title: contract.title, href: `/contracts/${contract.id}` });
    return;
  }

  if (toolCall.tool === "create_budget_item") {
    const budgetItem = await createBudgetItem({
      title: toolCall.args.title,
      category: toolCall.args.category,
      projectId: toolCall.args.projectId ?? context.created.projectId,
      contractId: toolCall.args.contractId ?? context.created.contractId,
      vendorId: toolCall.args.vendorId ?? context.created.vendorId,
      fiscalYear: toolCall.args.fiscalYear ?? null,
      plannedAmount: toolCall.args.plannedAmount ?? null,
      committedAmount: toolCall.args.committedAmount ?? null,
      estimatedActualAmount: toolCall.args.estimatedActualAmount ?? null,
      notes: toolCall.args.notes
    });
    context.records.push({ module: "budget", id: budgetItem.id, title: budgetItem.title, href: `/budget/${budgetItem.id}` });
    return;
  }

  if (toolCall.tool === "create_communication") {
    const communication = await createCommunication({
      title: toolCall.args.title,
      type: toolCall.args.type,
      status: toolCall.args.status === "READY" || toolCall.args.status === "SENT" || toolCall.args.status === "ARCHIVED"
        ? toolCall.args.status
        : "DRAFT",
      contentText: toolCall.args.contentText,
      contentMarkdown: toolCall.args.contentMarkdown,
      projectId: toolCall.args.projectId ?? context.created.projectId,
      actionId: toolCall.args.actionId ?? null,
      contractId: toolCall.args.contractId ?? context.created.contractId
    });
    context.records.push({
      module: "communications",
      id: communication.id,
      title: communication.title,
      href: `/communications/${communication.id}`
    });
    return;
  }

  const action = await createAction({
    title: toolCall.args.title,
    description: toolCall.args.description ?? buildExcerpt(context.sourceText),
    dueDate: toolCall.args.dueDate ?? null,
    status: toolCall.args.status === "IN_PROGRESS" || toolCall.args.status === "BLOCKED" || toolCall.args.status === "WAITING" || toolCall.args.status === "DONE"
      ? toolCall.args.status
      : "TODO",
    priority: toolCall.args.priority === "LOW" || toolCall.args.priority === "HIGH" || toolCall.args.priority === "CRITICAL"
      ? toolCall.args.priority
      : "NORMAL",
    projectId: toolCall.args.projectId ?? context.created.projectId,
    vendorId: toolCall.args.vendorId ?? context.created.vendorId,
    contractId: toolCall.args.contractId ?? context.created.contractId,
    sourceType: "AI_INTAKE",
    sourceRef: context.sourceRef
  });
  context.records.push({ module: "actions", id: action.id, title: action.title, href: `/actions/${action.id}` });
}

async function extractToolCallForStep(args: {
  provider: ReturnType<typeof getAIProvider>;
  module: IntakeModule;
  sourceText: string;
  sourceName: string | null;
  projectCandidates: ProjectCandidate[];
}) {
  try {
    const draft = await args.provider.suggestDraft(args.module, {
      text: args.sourceText,
      context: {
        sourceName: args.sourceName,
        candidateProjects: args.projectCandidates.length > 0 ? JSON.stringify(args.projectCandidates) : null
      }
    });
    const toolCall = buildToolCallFromDraft(args.module, draft);
    if (toolCall) {
      return toolCall;
    }
  } catch {
    // fallback below
  }

  const decision = analyzeIntakeText(args.sourceText, args.sourceName);
  return decision.toolCalls.find((toolCall) => toolToModule(toolCall.tool) === args.module) ?? null;
}

async function createRecordsFromPlan(args: {
  sourceName: string | null;
  sourceText: string;
  provider: ReturnType<typeof getAIProvider>;
  plan: IntakeExecutionPlan;
  projectCandidates: ProjectCandidate[];
}) {
  const created: CreatedRecord[] = [];
  const sourceRef = buildSourceReference(args.sourceName);
  const context = {
    created: { vendorId: null, projectId: null, contractId: null, stepRefs: new Map<string, { module: IntakeModule; id: string }>() },
    records: created,
    sourceRef,
    sourceText: args.sourceText
  };

  for (const step of args.plan.steps) {
    let toolCall = await extractToolCallForStep({
      provider: args.provider,
      module: step.module,
      sourceText: step.sourceText,
      sourceName: args.sourceName,
      projectCandidates: args.projectCandidates
    });

    if (!toolCall) {
      throw new Error(`Impossible d'extraire un brouillon exploitable pour ${step.module}.`);
    }

    if (
      step.module === "actions" &&
      step.dependsOn &&
      step.relation === "project_of" &&
      toolCall.tool === "create_action" &&
      !toolCall.args.projectId
    ) {
      const dependency = context.created.stepRefs.get(step.dependsOn);
      if (dependency?.module === "projects") {
        toolCall = {
          ...toolCall,
          args: {
            ...toolCall.args,
            projectId: dependency.id
          }
        };
      }
    }

    const previousCount = context.records.length;
    await executeToolCall(toolCall, context);
    const latestRecord = context.records[context.records.length - 1];

    if (context.records.length > previousCount && latestRecord) {
      context.created.stepRefs.set(step.id, { module: latestRecord.module, id: latestRecord.id });
    } else if (toolCall.tool === "create_project" && context.created.projectId) {
      context.created.stepRefs.set(step.id, { module: "projects", id: context.created.projectId });
    }
  }

  return {
    disposition: "created",
    sourceName: args.sourceName,
    provider: args.provider.info,
    summary: args.plan.summary,
    modules: Array.from(new Set(created.map((record) => record.module))),
    created
  } satisfies AIIntakeCreatedResult;
}

async function createRecordsFromDecision(sourceName: string | null, sourceText: string, provider: ProviderInfo, decision: IntakeDecision) {
  const created: CreatedRecord[] = [];
  const sourceRef = buildSourceReference(sourceName);
  const context = {
    created: { vendorId: null, projectId: null, contractId: null },
    records: created,
    sourceRef,
    sourceText
  };

  for (const toolCall of decision.toolCalls) {
    await executeToolCall(toolCall, context);
  }

  return {
    disposition: "created",
    sourceName,
    provider,
    summary: decision.summary,
    modules: modulesFromToolCalls(decision.toolCalls),
    created
  } satisfies AIIntakeCreatedResult;
}

async function tryHeuristicFallback(args: {
  sourceName: string | null;
  text: string;
  provider: ProviderInfo;
}) {
  const heuristicDecision = analyzeIntakeText(args.text, args.sourceName);
  const heuristicReviewReason = reviewReasonForDecision(heuristicDecision);

  if (!heuristicReviewReason) {
    return createRecordsFromDecision(args.sourceName, args.text, args.provider, heuristicDecision);
  }

  return queueReviewFromDecision({
    sourceName: args.sourceName,
    text: args.text,
    provider: args.provider,
    decision: heuristicDecision,
    reviewReason: heuristicReviewReason
  });
}

export async function ingestAIIntake(payload: AIIntakeInput): Promise<AIIntakeResult> {
  const validated = aiIntakeSchema.parse(payload);
  const provider = getAIProvider();
  const projectCandidates = await getProjectCandidatesForIntake(validated.text);

  try {
    const plan = await provider.planIntake({
      text: validated.text,
      context: {
        sourceName: validated.sourceName ?? null,
        candidateProjects: projectCandidates.length > 0 ? JSON.stringify(projectCandidates) : null
      }
    });

    if (plan.steps.length > 1) {
      return await createRecordsFromPlan({
        sourceName: validated.sourceName ?? null,
        sourceText: validated.text,
        provider,
        plan,
        projectCandidates
      });
    }

    const decision = attachExistingProjectContext(await provider.analyzeIntake({
      text: validated.text,
      context: {
        sourceName: validated.sourceName ?? null,
        candidateProjects: projectCandidates.length > 0 ? JSON.stringify(projectCandidates) : null
      }
    }), validated.text, projectCandidates);
    const reviewReason = reviewReasonForDecision(decision);

    if (reviewReason) {
      return queueReviewFromDecision({
        sourceName: validated.sourceName ?? null,
        text: validated.text,
        provider: provider.info,
        decision,
        reviewReason
      });
    }

    return await createRecordsFromDecision(validated.sourceName ?? null, validated.text, provider.info, decision);
  } catch (error) {
    const fallbackResult = await tryHeuristicFallback({
      sourceName: validated.sourceName ?? null,
      text: validated.text,
      provider: provider.info
    });

    if (fallbackResult.disposition === "created") {
      return fallbackResult;
    }

    return queueReviewFromDecision({
      sourceName: validated.sourceName ?? null,
      text: validated.text,
      provider: provider.info,
      decision: attachExistingProjectContext(
        analyzeIntakeText(validated.text, validated.sourceName ?? null),
        validated.text,
        projectCandidates
      ),
      reviewReason: `L’analyse automatique n’a pas pu produire un résultat exploitable: ${formatIntakeError(error)}`
    });
  }
}
