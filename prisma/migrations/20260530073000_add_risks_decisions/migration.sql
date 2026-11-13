-- CreateTable
CREATE TABLE "Risk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "impact" TEXT NOT NULL DEFAULT 'MEDIUM',
    "probability" TEXT NOT NULL DEFAULT 'MEDIUM',
    "criticality" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "mitigation" TEXT,
    "projectId" TEXT,
    "vendorId" TEXT,
    "ownerName" TEXT,
    "dueDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Risk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Risk_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subject" TEXT NOT NULL,
    "context" TEXT,
    "optionsJson" TEXT,
    "recommendation" TEXT,
    "decider" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "targetDate" DATETIME,
    "projectId" TEXT,
    "contractId" TEXT,
    "budgetItemId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Decision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Decision_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Decision_budgetItemId_fkey" FOREIGN KEY ("budgetItemId") REFERENCES "BudgetItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

