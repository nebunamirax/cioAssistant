import { analyzeIntakeText } from "@/lib/ai/intake-analyzer";
import { type IntakeExecutionPlan, type IntakeModule, toolToModule } from "@/lib/ai/intake-schema";
import { type AIProvider, type AIRequest, type AIResult } from "@/lib/ai/types";

function splitLocalPlanSteps(text: string): IntakeExecutionPlan["steps"] {
  const normalized = text.replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();
  const parts = normalized
    .split(/\s+\bet\b\s+(?=(?:ajoute|ajouter|cree|créer|creer|ouvre|ouvrir|lance|lancer)\b)/i)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    const decision = analyzeIntakeText(normalized, null);
    const module = decision.primaryModule ?? (decision.toolCalls[0] ? toolToModule(decision.toolCalls[0].tool) : "actions");
    return [{ id: "step_1", module, action: "create", sourceText: normalized, dependsOn: null, relation: null }];
  }

  const steps: IntakeExecutionPlan["steps"] = [];
  let projectStepId: string | null = null;

  parts.forEach((part, index) => {
    const stepId = `step_${index + 1}`;
    const decision = analyzeIntakeText(part, null);
    const module = decision.primaryModule ?? (decision.toolCalls[0] ? toolToModule(decision.toolCalls[0].tool) : "actions");

    if (module === "projects") {
      projectStepId = stepId;
      steps.push({ id: stepId, module, action: "create", sourceText: part, dependsOn: null, relation: null });
      return;
    }

    steps.push({
      id: stepId,
      module,
      action: "create",
      sourceText: part,
      dependsOn: module === "actions" ? projectStepId : null,
      relation: module === "actions" && projectStepId ? "project_of" : null
    });
  });

  return steps;
}

export class LocalAIProvider implements AIProvider {
  name = "local-provider";
  info: AIProvider["info"];

  constructor(private readonly model = "heuristic-v1") {
    this.info = {
      provider: "local",
      label: "Heuristic local router",
      mode: "local",
      model,
      location: "local"
    };
  }

  async analyzeIntake(input: AIRequest) {
    return analyzeIntakeText(input.text, typeof input.context?.sourceName === "string" ? input.context.sourceName : null);
  }

  async planIntake(input: AIRequest): Promise<IntakeExecutionPlan> {
    return {
      summary: input.text.slice(0, 280),
      steps: splitLocalPlanSteps(input.text)
    };
  }

  async suggestDraft(module: IntakeModule, input: AIRequest) {
    const decision = await this.analyzeIntake(input);
    const matchingCall = decision.toolCalls.find((toolCall) => toolToModule(toolCall.tool) === module);
    return matchingCall?.args ?? {};
  }

  async testConnection() {
    return {
      ok: false,
      message: "Aucun appel réseau possible: heuristic-v1 est un fallback local non connecté à un modèle IA réel."
    };
  }

  async summarize(input: AIRequest): Promise<AIResult> {
    return { task: "summarize", data: { summary: input.text.slice(0, 240) } };
  }

  async extract(input: AIRequest): Promise<AIResult> {
    return { task: "extract", data: await this.analyzeIntake(input) };
  }

  async classify(input: AIRequest): Promise<AIResult> {
    return { task: "classify", data: { category: "general", confidence: 0.2, sample: input.text.slice(0, 60) } };
  }

  async suggestProject(input: AIRequest): Promise<AIResult> {
    return { task: "suggest-project", data: { suggestedProject: null, reason: "No local model configured" } };
  }
}
