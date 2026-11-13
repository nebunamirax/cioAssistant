import { externalSourceLabel } from "@/lib/domain/external-tracking";
import { externalAttentionLabel, listExternalAttention } from "@/lib/services/external-tracking-service";
import { prisma } from "@/lib/db/prisma";

export type ReportType = "comex" | "codir" | "budget" | "vendors";

export const REPORT_TYPES: { type: ReportType; label: string; description: string }[] = [
  { type: "comex", label: "COMEX", description: "Synthèse stratégique, arbitrages, risques majeurs et trajectoire budgétaire." },
  { type: "codir", label: "CODIR DSI", description: "Pilotage opérationnel des projets, actions, décisions et points de blocage." },
  { type: "budget", label: "Budget IT", description: "Prévu, engagé, estimé, écarts et points d’attention financiers." },
  { type: "vendors", label: "Fournisseurs", description: "Contrats, dépendances critiques, renouvellements et risques fournisseurs." }
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value?: Date | null) {
  return value ? new Intl.DateTimeFormat("fr-FR").format(value) : "non daté";
}

function sum(values: Array<number | null>) {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

export async function buildReportContext() {
  const now = new Date();
  const next45Days = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 45);

  const [
    projects,
    overdueActions,
    blockedActions,
    contractsEnding,
    budgetItems,
    vendors,
    risks,
    decisions,
    objectives
  ] = await Promise.all([
    prisma.project.findMany({
      where: { status: { in: ["ACTIVE", "ON_HOLD"] } },
      include: {
        actions: { where: { status: { not: "DONE" } }, orderBy: [{ dueDate: "asc" }], take: 5 },
        budgetItems: true,
        contracts: true
      },
      orderBy: [{ priority: "desc" }, { targetDate: "asc" }],
      take: 8
    }),
    prisma.action.findMany({
      where: { dueDate: { lt: now }, status: { not: "DONE" } },
      include: { project: true },
      orderBy: [{ dueDate: "asc" }],
      take: 10
    }),
    prisma.action.findMany({
      where: { status: { in: ["BLOCKED", "WAITING"] } },
      include: { project: true },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      take: 10
    }),
    prisma.contract.findMany({
      where: { endDate: { lte: next45Days } },
      include: { vendor: true, project: true },
      orderBy: [{ endDate: "asc" }],
      take: 10
    }),
    prisma.budgetItem.findMany({
      include: { project: true, vendor: true, contract: true },
      orderBy: [{ fiscalYear: "desc" }, { plannedAmount: "desc" }]
    }),
    prisma.vendor.findMany({
      include: {
        contracts: { orderBy: [{ endDate: "asc" }], take: 3 },
        risks: { where: { status: { not: "CLOSED" } }, orderBy: [{ criticality: "desc" }], take: 3 }
      },
      orderBy: { name: "asc" },
      take: 10
    }),
    prisma.risk.findMany({
      where: { status: { not: "CLOSED" } },
      include: { project: true, vendor: true },
      orderBy: [{ criticality: "desc" }, { dueDate: "asc" }],
      take: 10
    }),
    prisma.decision.findMany({
      where: { status: "PENDING" },
      include: { project: true, contract: true, budgetItem: true },
      orderBy: [{ targetDate: "asc" }],
      take: 10
    }),
    prisma.strategicObjective.findMany({
      select: {
        title: true,
        ownerName: true,
        targetDate: true,
        projects: { where: { status: { not: "CANCELLED" } }, select: { status: true } }
      },
      orderBy: { title: "asc" }
    })
  ]);

  const planned = sum(budgetItems.map((item) => item.plannedAmount));
  const committed = sum(budgetItems.map((item) => item.committedAmount));
  const estimated = sum(budgetItems.map((item) => item.estimatedActualAmount));

  return {
    generatedAt: now,
    projects,
    overdueActions,
    blockedActions,
    contractsEnding,
    budgetItems,
    vendors,
    risks,
    decisions,
    objectives,
    totals: {
      planned,
      committed,
      estimated,
      variance: estimated - planned
    }
  };
}

export async function generateReportMarkdown(type: ReportType) {
  const context = await buildReportContext();
  const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(context.generatedAt);
  const header = `# Rapport ${REPORT_TYPES.find((report) => report.type === type)?.label ?? "DSI"}\n\n_Généré le ${date}_\n`;

  if (type === "budget") {
    return `${header}
## Synthèse financière
- Budget prévu: ${formatCurrency(context.totals.planned)}
- Budget engagé: ${formatCurrency(context.totals.committed)}
- Estimé à terminaison: ${formatCurrency(context.totals.estimated)}
- Écart estimé: ${formatCurrency(context.totals.variance)}

## Principales lignes
${context.budgetItems.slice(0, 12).map((item) => `- ${item.title}: prévu ${formatCurrency(item.plannedAmount ?? 0)}, engagé ${formatCurrency(item.committedAmount ?? 0)}, estimé ${formatCurrency(item.estimatedActualAmount ?? 0)}${item.project ? ` (${item.project.title})` : ""}`).join("\n") || "- Aucune ligne budgétaire."}

## Points d'attention
${context.risks.slice(0, 5).map((risk) => `- ${risk.criticality}: ${risk.title}`).join("\n") || "- Aucun risque budgétaire ou opérationnel ouvert."}
`;
  }

  if (type === "vendors") {
    return `${header}
## Fournisseurs suivis
${context.vendors.map((vendor) => `- ${vendor.name}: ${vendor.contracts.length} contrat(s), ${vendor.risks.length} risque(s) ouvert(s)`).join("\n") || "- Aucun fournisseur."}

## Contrats à échéance
${context.contractsEnding.map((contract) => `- ${contract.title} / ${contract.vendor.name}: échéance ${formatDate(contract.endDate)}`).join("\n") || "- Aucun contrat à échéance courte."}

## Risques fournisseurs
${context.risks.filter((risk) => risk.vendor).map((risk) => `- ${risk.vendor?.name}: ${risk.title} (${risk.criticality})`).join("\n") || "- Aucun risque fournisseur ouvert."}
`;
  }

  if (type === "codir") {
    const external = await listExternalAttention(context.generatedAt);
    const alerts = external.map((item) => {
      const title = item.title.replace(/\s+/g, " ").replace(/[\[\]<>*_]/g, "\\$&");
      const label = item.url ? `[${title}](<${item.url}>)` : title;
      return `- ${label} · ${externalSourceLabel(item.source.kind)} (${item.source.title.replace(/\s+/g, " ")}) · ${(item.source.project?.title ?? item.source.service?.title ?? "—").replace(/\s+/g, " ")} · ${externalAttentionLabel(item, context.generatedAt)} · ${formatDate(item.dueDate)}`;
    });
    return `${header}
## Objectifs stratégiques
${context.objectives.map((objective) => `- ${objective.title} · ${objective.projects.filter((project) => project.status === "COMPLETED").length}/${objective.projects.length} projets terminés · ${objective.ownerName ?? "Responsable à définir"} · ${formatDate(objective.targetDate)}`).join("\n") || "- Aucun objectif renseigné."}

## Projets actifs
${context.projects.map((project) => `- ${project.title}: ${project.status}, priorité ${project.priority}, cible ${formatDate(project.targetDate)}`).join("\n") || "- Aucun projet actif."}

## Actions bloquées ou en attente
${context.blockedActions.map((action) => `- ${action.title} (${action.status}) · ${action.ownerName ?? "Sans responsable"}${action.project ? ` - ${action.project.title}` : ""}`).join("\n") || "- Aucune action bloquée."}

## Alertes externes
${alerts.join("\n") || "- Aucun retard ni blocage externe."}

## Décisions attendues
${context.decisions.map((decision) => `- ${decision.subject}: décideur ${decision.decider ?? "à préciser"}, cible ${formatDate(decision.targetDate)}`).join("\n") || "- Aucune décision en attente."}

## Risques ouverts
${context.risks.slice(0, 8).map((risk) => `- ${risk.criticality}: ${risk.title}`).join("\n") || "- Aucun risque ouvert."}
`;
  }

  return `${header}
## Message clé
Le portefeuille DSI compte ${context.projects.length} projet(s) actifs ou sous surveillance, ${context.overdueActions.length} action(s) en retard, ${context.risks.length} risque(s) ouvert(s) et ${context.decisions.length} arbitrage(s) en attente.

## Santé du portefeuille
${context.projects.slice(0, 6).map((project) => `- ${project.title}: ${project.status}, priorité ${project.priority}, ${project.actions.length} action(s) ouvertes`).join("\n") || "- Aucun projet actif."}

## Arbitrages demandés
${context.decisions.slice(0, 5).map((decision) => `- ${decision.subject}: recommandation ${decision.recommendation ?? "à formaliser"}`).join("\n") || "- Aucun arbitrage COMEX demandé."}

## Risques majeurs
${context.risks.slice(0, 5).map((risk) => `- ${risk.criticality}: ${risk.title}${risk.mitigation ? ` - mitigation: ${risk.mitigation}` : ""}`).join("\n") || "- Aucun risque majeur ouvert."}

## Budget
- Prévu: ${formatCurrency(context.totals.planned)}
- Engagé: ${formatCurrency(context.totals.committed)}
- Estimé: ${formatCurrency(context.totals.estimated)}
- Écart: ${formatCurrency(context.totals.variance)}

## Échéances contractuelles
${context.contractsEnding.slice(0, 5).map((contract) => `- ${contract.title} (${contract.vendor.name}) avant le ${formatDate(contract.endDate)}`).join("\n") || "- Aucune échéance contractuelle courte."}
`;
}
