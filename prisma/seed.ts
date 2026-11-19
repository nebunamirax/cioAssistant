import { PrismaClient } from "@prisma/client";
import {
  ACTION_STATUSES,
  COMMUNICATION_STATUSES,
  CONTRACT_STATUSES,
  DECISION_STATUSES,
  PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  RENEWAL_TYPES,
  RISK_LEVELS,
  RISK_STATUSES
} from "@/lib/domain/constants";

const prisma = new PrismaClient();

const today = new Date();

function date(days: number) {
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + days, 9));
}

async function main() {
  const vendors = [
    { id: "vendor-microsoft", name: "Microsoft", category: "Cloud & Workplace" },
    { id: "vendor-aws", name: "AWS", category: "Cloud public" },
    { id: "vendor-servicenow", name: "ServiceNow", category: "ITSM" },
    { id: "vendor-sap", name: "SAP", category: "ERP" },
    { id: "vendor-orange", name: "Orange Business", category: "Réseau" },
    { id: "vendor-soc", name: "CyberShield MSSP", category: "Cybersécurité" }
  ];

  for (const vendor of vendors) {
    await prisma.vendor.upsert({
      where: { id: vendor.id },
      update: vendor,
      create: {
        ...vendor,
        mainContactName: "Account manager",
        mainContactEmail: `contact+${vendor.id.replace("vendor-", "")}@example.com`,
        notes: "Fournisseur clé du portefeuille DSI."
      }
    });
  }

  const projects = [
    {
      id: "project-erp-modernization",
      title: "Modernisation ERP finance",
      type: PROJECT_TYPES[3],
      status: PROJECT_STATUSES[1],
      priority: PRIORITIES[3],
      targetDate: date(44)
    },
    {
      id: "project-zero-trust",
      title: "Programme Zero Trust",
      type: PROJECT_TYPES[5],
      status: PROJECT_STATUSES[1],
      priority: PRIORITIES[3],
      targetDate: date(21)
    },
    {
      id: "project-cloud-cost",
      title: "Optimisation coûts cloud",
      type: PROJECT_TYPES[4],
      status: PROJECT_STATUSES[1],
      priority: PRIORITIES[2],
      targetDate: date(60)
    },
    {
      id: "project-itsm",
      title: "Refonte ITSM et catalogue services",
      type: PROJECT_TYPES[3],
      status: PROJECT_STATUSES[1],
      priority: PRIORITIES[2],
      targetDate: date(32)
    },
    {
      id: "project-network-refresh",
      title: "Renouvellement réseau sites critiques",
      type: PROJECT_TYPES[5],
      status: PROJECT_STATUSES[2],
      priority: PRIORITIES[2],
      targetDate: date(73)
    }
  ];

  for (const project of projects) {
    await prisma.project.upsert({
      where: { id: project.id },
      update: project,
      create: {
        ...project,
        description: "Initiative structurante du portefeuille DSI de démonstration.",
        startDate: date(-30)
      }
    });
  }

  const milestones = [
    ["milestone-demo-erp", "Valider le périmètre ERP", "project-erp-modernization", 10],
    ["milestone-demo-mfa", "Ouvrir le pilote MFA prestataires", "project-zero-trust", 14],
    ["milestone-demo-itsm", "Recetter le catalogue de services", "project-itsm", 25]
  ] as const;
  for (const [id, title, projectId, days] of milestones) {
    const milestone = { title, projectId, dueDate: date(days) };
    await prisma.milestone.upsert({ where: { id }, create: { id, ...milestone }, update: milestone });
  }

  const contracts = [
    ["contract-m365", "Microsoft 365 E5", "vendor-microsoft", "project-zero-trust", 95, 420000],
    ["contract-aws", "Contrat AWS Enterprise", "vendor-aws", "project-cloud-cost", 113, 620000],
    ["contract-snow", "ServiceNow ITSM Pro", "vendor-servicenow", "project-itsm", 204, 280000],
    ["contract-sap", "SAP S/4HANA programme", "vendor-sap", "project-erp-modernization", 177, 940000],
    ["contract-orange", "WAN sites critiques", "vendor-orange", "project-network-refresh", 88, 310000]
  ] as const;

  for (const [id, title, vendorId, projectId, endDate, amountPlanned] of contracts) {
    await prisma.contract.upsert({
      where: { id },
      update: { title, vendorId, projectId, endDate: date(endDate), amountPlanned },
      create: {
        id,
        title,
        vendorId,
        projectId,
        status: CONTRACT_STATUSES[1],
        renewalType: RENEWAL_TYPES[1],
        contractType: "Abonnement / services",
        startDate: date(-245),
        endDate: date(endDate),
        noticePeriodDays: 90,
        amountPlanned,
        notes: "Contrat à suivre dans le calendrier de renouvellement."
      }
    });
  }

  const budgetItems = [
    ["budget-erp", "Programme ERP finance", "project-erp-modernization", "vendor-sap", 1200000, 720000, 1320000],
    ["budget-security", "Zero Trust et SOC managé", "project-zero-trust", "vendor-soc", 680000, 410000, 690000],
    ["budget-cloud", "Run cloud public", "project-cloud-cost", "vendor-aws", 850000, 540000, 790000],
    ["budget-itsm", "Plateforme ITSM", "project-itsm", "vendor-servicenow", 360000, 260000, 380000],
    ["budget-network", "Réseau sites critiques", "project-network-refresh", "vendor-orange", 440000, 190000, 510000]
  ] as const;

  for (const [id, title, projectId, vendorId, plannedAmount, committedAmount, estimatedActualAmount] of budgetItems) {
    await prisma.budgetItem.upsert({
      where: { id },
      update: { title, projectId, vendorId, plannedAmount, committedAmount, estimatedActualAmount },
      create: {
        id,
        title,
        category: "Transformation DSI",
        projectId,
        vendorId,
        fiscalYear: today.getUTCFullYear(),
        plannedAmount,
        committedAmount,
        estimatedActualAmount,
        notes: "Ligne de démonstration pour le reporting exécutif."
      }
    });
  }

  const actions = [
    ["action-erp-arbitration", "Valider le périmètre lot 1 ERP", "project-erp-modernization", ACTION_STATUSES[3], PRIORITIES[3], -2],
    ["action-erp-data", "Finaliser la stratégie reprise de données", "project-erp-modernization", ACTION_STATUSES[1], PRIORITIES[2], 4],
    ["action-zta-mfa", "Étendre MFA aux comptes prestataires", "project-zero-trust", ACTION_STATUSES[1], PRIORITIES[3], 7],
    ["action-zta-board", "Préparer arbitrage segmentation réseau", "project-zero-trust", ACTION_STATUSES[2], PRIORITIES[3], -3],
    ["action-cloud-savings", "Présenter plan savings AWS", "project-cloud-cost", ACTION_STATUSES[0], PRIORITIES[2], 5],
    ["action-itsm-catalog", "Publier catalogue services MVP", "project-itsm", ACTION_STATUSES[1], PRIORITIES[2], 14],
    ["action-network-sites", "Replanifier déploiement sites industriels", "project-network-refresh", ACTION_STATUSES[2], PRIORITIES[2], -1]
  ] as const;

  for (const [id, title, projectId, status, priority, dueDate] of actions) {
    await prisma.action.upsert({
      where: { id },
      update: { title, projectId, status, priority, dueDate: date(dueDate) },
      create: {
        id,
        title,
        projectId,
        status,
        priority,
        dueDate: date(dueDate),
        ownerName: "DSI / PMO",
        description: "Action issue du portefeuille de démonstration."
      }
    });
  }

  const risks = [
    ["risk-erp-scope", "Dérive de périmètre ERP finance", "project-erp-modernization", null, RISK_LEVELS[3], "Limiter le lot 1 aux processus finance critiques et arbitrer les demandes métiers."],
    ["risk-zta-adoption", "Adoption MFA incomplète côté prestataires", "project-zero-trust", "vendor-microsoft", RISK_LEVELS[2], "Conditionner les accès externes au durcissement MFA et suivre les exceptions."],
    ["risk-cloud-cost", "Dépassement run cloud", "project-cloud-cost", "vendor-aws", RISK_LEVELS[2], "Mettre sous gouvernance les ressources non taguées et négocier les engagements."],
    ["risk-network-delay", "Retard réseau sites critiques", "project-network-refresh", "vendor-orange", RISK_LEVELS[2], "Reprioriser les sites industriels et formaliser un planning révisé."]
  ] as const;

  for (const [id, title, projectId, vendorId, criticality, mitigation] of risks) {
    await prisma.risk.upsert({
      where: { id },
      update: { title, projectId, vendorId, criticality, mitigation },
      create: {
        id,
        title,
        projectId,
        vendorId,
        criticality,
        impact: criticality,
        probability: RISK_LEVELS[2],
        status: RISK_STATUSES[1],
        ownerName: "PMO DSI",
        description: "Risque majeur suivi pour reporting exécutif.",
        mitigation
      }
    });
  }

  const decisions = [
    ["decision-erp-scope", "Arbitrer le périmètre ERP lot 1", "project-erp-modernization", "COMEX", "Valider un périmètre réduit pour sécuriser la date cible."],
    ["decision-zta-network", "Choisir le niveau de segmentation réseau", "project-zero-trust", "RSSI / DG", "Retenir l’option progressive par zones critiques."],
    ["decision-cloud-commit", "Signer un engagement cloud 12 mois", "project-cloud-cost", "DAF", "Signer un engagement maîtrisé pour capter les économies sans verrouiller les usages."],
    ["decision-network-budget", "Compléter le budget réseau sites critiques", "project-network-refresh", "COMEX", "Financer le surcoût sur les sites industriels prioritaires."]
  ] as const;

  for (const [id, subject, projectId, decider, recommendation] of decisions) {
    await prisma.decision.upsert({
      where: { id },
      update: { subject, projectId, decider, recommendation, targetDate: date(2) },
      create: {
        id,
        subject,
        projectId,
        decider,
        recommendation,
        status: DECISION_STATUSES[0],
        targetDate: date(2),
        context: "Décision nécessaire pour tenir la trajectoire portefeuille.",
        optionsJson: JSON.stringify(["Option prudente", "Option accélérée", "Option report"])
      }
    });
  }

  await prisma.communication.upsert({
    where: { id: "communication-comex-june" },
    update: {},
    create: {
      id: "communication-comex-june",
      title: "Synthèse COMEX DSI",
      status: COMMUNICATION_STATUSES[1],
      type: "COMEX",
      contentText: "Point portefeuille, risques majeurs, arbitrages attendus et trajectoire budget.",
      contentMarkdown: "## Synthèse\nPortefeuille sous contrôle avec arbitrages requis sur ERP, Zero Trust et réseau."
    }
  });

  await prisma.meetingNote.upsert({
    where: { id: "meeting-codir-dsi" },
    update: { meetingDate: date(-5) },
    create: {
      id: "meeting-codir-dsi",
      title: "CODIR DSI - revue portefeuille",
      meetingDate: date(-5),
      rawContent: "Revue des projets ERP, Zero Trust, ITSM et réseau. Actions sur arbitrages et risques.",
      summary: "Le CODIR confirme les priorités ERP et cybersécurité, avec arbitrages COMEX à préparer.",
      extractedActionsJson: JSON.stringify(["Préparer arbitrage ERP lot 1", "Mettre à jour plan MFA prestataires"]),
      extractedDecisionsJson: JSON.stringify(["Arbitrage segmentation réseau à présenter au COMEX"]),
      extractedRisksJson: JSON.stringify(["Dérive périmètre ERP", "Retard réseau sites critiques"])
    }
  });
}

main().finally(async () => prisma.$disconnect());
