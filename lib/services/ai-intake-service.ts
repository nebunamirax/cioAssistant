import { prisma } from "@/lib/db/prisma";
import { type IntakeModule } from "@/lib/ai/intake-schema";
import { getAIProvider } from "@/lib/ai/provider-factory";
import { aiIntakeSchema, type AIIntakeInput } from "@/lib/validation/ai-intake";
import { createAction } from "@/lib/services/action-service";
import { createBudgetItem } from "@/lib/services/budget-item-service";
import { createCommunication } from "@/lib/services/communication-service";
import { createContract } from "@/lib/services/contract-service";
import { createProject } from "@/lib/services/project-service";
import { createVendor } from "@/lib/services/vendor-service";

type CreatedRecord = {
  module: IntakeModule;
  id: string;
  title: string;
  href: string;
};

function buildSourceReference(sourceName?: string | null) {
  return sourceName?.trim() ? `ai-intake:${sourceName.trim()}` : "ai-intake";
}

function buildExcerpt(text: string) {
  return text.trim().slice(0, 500);
}

export async function ingestAIIntake(payload: AIIntakeInput) {
  const validated = aiIntakeSchema.parse(payload);
  const provider = getAIProvider();
  const analysis = await provider.analyzeIntake({
    text: validated.text,
    context: {
      sourceName: validated.sourceName ?? null
    }
  });
  const created: CreatedRecord[] = [];
  const sourceRef = buildSourceReference(validated.sourceName);

  let vendorId: string | null = null;
  let projectId: string | null = null;
  let contractId: string | null = null;

  if (analysis.vendor) {
    const existingVendor = await prisma.vendor.findFirst({
      where: { name: analysis.vendor.name }
    });

    if (existingVendor) {
      vendorId = existingVendor.id;
    } else {
      const vendor = await createVendor({
        name: analysis.vendor.name,
        category: analysis.vendor.category,
        notes: analysis.vendor.notes,
        mainContactEmail: analysis.vendor.mainContactEmail ?? undefined
      });
      vendorId = vendor.id;
      created.push({
        module: "vendors",
        id: vendor.id,
        title: vendor.name,
        href: `/vendors/${vendor.id}`
      });
    }
  }

  if (analysis.project) {
    const existingProject = await prisma.project.findFirst({
      where: { title: analysis.project.title }
    });

    if (existingProject) {
      projectId = existingProject.id;
    } else {
      const project = await createProject({
        ...analysis.project,
        status: "DRAFT",
        priority: "NORMAL"
      });
      projectId = project.id;
      created.push({
        module: "projects",
        id: project.id,
        title: project.title,
        href: `/projects/${project.id}`
      });
    }
  }

  if (analysis.contract && vendorId) {
    const existingContract = await prisma.contract.findFirst({
      where: { title: analysis.contract.title }
    });

    if (existingContract) {
      contractId = existingContract.id;
    } else {
      const contract = await createContract({
        vendorId,
        projectId,
        title: analysis.contract.title,
        contractType: analysis.contract.contractType,
        notes: analysis.contract.notes,
        status: "DRAFT",
        renewalType: "NONE"
      });
      contractId = contract.id;
      created.push({
        module: "contracts",
        id: contract.id,
        title: contract.title,
        href: `/contracts/${contract.id}`
      });
    }
  }

  if (analysis.budgetItem) {
    const budgetItem = await createBudgetItem({
      ...analysis.budgetItem,
      projectId,
      vendorId,
      contractId
    });
    created.push({
      module: "budget",
      id: budgetItem.id,
      title: budgetItem.title,
      href: `/budget/${budgetItem.id}`
    });
  }

  if (analysis.communication) {
    const communication = await createCommunication({
      title: analysis.communication.title,
      type: analysis.communication.type,
      contentText: analysis.communication.contentText,
      projectId,
      contractId,
      status: "DRAFT"
    });
    created.push({
      module: "communications",
      id: communication.id,
      title: communication.title,
      href: `/communications/${communication.id}`
    });
  }

  for (const draft of analysis.actions) {
    const action = await createAction({
      title: draft.title,
      description: draft.description ?? buildExcerpt(validated.text),
      dueDate: draft.dueDate ?? null,
      projectId,
      vendorId,
      contractId,
      status: "TODO",
      priority: "NORMAL",
      sourceType: "AI_INTAKE",
      sourceRef
    });

    created.push({
      module: "actions",
      id: action.id,
      title: action.title,
      href: `/actions/${action.id}`
    });
  }

  return {
    sourceName: validated.sourceName ?? null,
    provider: provider.info,
    summary: analysis.summary,
    modules: analysis.modules,
    created
  };
}
