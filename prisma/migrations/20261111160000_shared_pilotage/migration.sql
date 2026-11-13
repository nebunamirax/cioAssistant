-- CreateTable
CREATE TABLE "Session" (
    "hash" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "failures" INTEGER NOT NULL,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ClaudeToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hash" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    CONSTRAINT "ClaudeToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClaudeWrite" (
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("userId", "key")
);

-- CreateTable
CREATE TABLE "ServiceControl" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "checkedAt" DATETIME NOT NULL,
    "result" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "nextDueAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceControl_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "SupportService" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MonthlyReport" (
    "month" TEXT NOT NULL PRIMARY KEY,
    "comment" TEXT NOT NULL DEFAULT '',
    "draft" TEXT NOT NULL,
    "archive" TEXT,
    "archivedAt" DATETIME
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Action" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerName" TEXT,
    "ownerId" TEXT,
    "serviceId" TEXT,
    "externalItemId" TEXT,
    "meetingNoteId" TEXT,
    "sourceUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "dueDate" DATETIME,
    "projectId" TEXT,
    "contractId" TEXT,
    "vendorId" TEXT,
    "sourceType" TEXT,
    "sourceRef" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    CONSTRAINT "Action_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Action_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "SupportService" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Action_externalItemId_fkey" FOREIGN KEY ("externalItemId") REFERENCES "ExternalItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Action_meetingNoteId_fkey" FOREIGN KEY ("meetingNoteId") REFERENCES "MeetingNote" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Action_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Action_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Action_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Action" ("completedAt", "contractId", "createdAt", "description", "dueDate", "id", "ownerName", "priority", "projectId", "sourceRef", "sourceType", "status", "title", "updatedAt", "vendorId") SELECT "completedAt", "contractId", "createdAt", "description", "dueDate", "id", "ownerName", "priority", "projectId", "sourceRef", "sourceType", "status", "title", "updatedAt", "vendorId" FROM "Action";
DROP TABLE "Action";
ALTER TABLE "new_Action" RENAME TO "Action";
CREATE UNIQUE INDEX "Action_externalItemId_key" ON "Action"("externalItemId");
CREATE TABLE "new_Decision" (
    "meetingNoteId" TEXT,
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
    CONSTRAINT "Decision_meetingNoteId_fkey" FOREIGN KEY ("meetingNoteId") REFERENCES "MeetingNote" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Decision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Decision_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Decision_budgetItemId_fkey" FOREIGN KEY ("budgetItemId") REFERENCES "BudgetItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Decision" ("budgetItemId", "context", "contractId", "createdAt", "decider", "id", "optionsJson", "projectId", "recommendation", "status", "subject", "targetDate", "updatedAt") SELECT "budgetItemId", "context", "contractId", "createdAt", "decider", "id", "optionsJson", "projectId", "recommendation", "status", "subject", "targetDate", "updatedAt" FROM "Decision";
DROP TABLE "Decision";
ALTER TABLE "new_Decision" RENAME TO "Decision";
CREATE TABLE "new_ExternalItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "originalStatus" TEXT,
    "assignees" TEXT NOT NULL DEFAULT '',
    "priority" TEXT,
    "dueDate" DATETIME,
    "major" BOOLEAN NOT NULL DEFAULT false,
    "progress" INTEGER,
    "url" TEXT,
    "lastSyncedAt" DATETIME NOT NULL,
    CONSTRAINT "ExternalItem_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ExternalSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ExternalItem" ("assignees", "dueDate", "externalId", "id", "lastSyncedAt", "originalStatus", "priority", "progress", "sourceId", "status", "title", "url") SELECT "assignees", "dueDate", "externalId", "id", "lastSyncedAt", "originalStatus", "priority", "progress", "sourceId", "status", "title", "url" FROM "ExternalItem";
DROP TABLE "ExternalItem";
ALTER TABLE "new_ExternalItem" RENAME TO "ExternalItem";
CREATE INDEX "ExternalItem_status_dueDate_idx" ON "ExternalItem"("status", "dueDate");
CREATE UNIQUE INDEX "ExternalItem_sourceId_externalId_key" ON "ExternalItem"("sourceId", "externalId");
CREATE TABLE "new_ExternalSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "projectId" TEXT,
    "serviceId" TEXT,
    "lastSyncedAt" DATETIME,
    "statusMappings" TEXT,
    CONSTRAINT "ExternalSource_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "SupportService" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExternalSource_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ExternalSource" ("id", "key", "kind", "lastSyncedAt", "projectId", "statusMappings", "title") SELECT "id", "key", "kind", "lastSyncedAt", "projectId", "statusMappings", "title" FROM "ExternalSource";
DROP TABLE "ExternalSource";
ALTER TABLE "new_ExternalSource" RENAME TO "ExternalSource";
CREATE INDEX "ExternalSource_projectId_idx" ON "ExternalSource"("projectId");
CREATE UNIQUE INDEX "ExternalSource_kind_key_key" ON "ExternalSource"("kind", "key");
CREATE TABLE "new_Risk" (
    "meetingNoteId" TEXT,
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
    CONSTRAINT "Risk_meetingNoteId_fkey" FOREIGN KEY ("meetingNoteId") REFERENCES "MeetingNote" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Risk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Risk_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Risk" ("createdAt", "criticality", "description", "dueDate", "id", "impact", "mitigation", "ownerName", "probability", "projectId", "status", "title", "updatedAt", "vendorId") SELECT "createdAt", "criticality", "description", "dueDate", "id", "impact", "mitigation", "ownerName", "probability", "projectId", "status", "title", "updatedAt", "vendorId" FROM "Risk";
DROP TABLE "Risk";
ALTER TABLE "new_Risk" RENAME TO "Risk";
CREATE TABLE "new_SupportService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT,
    "contractId" TEXT,
    "title" TEXT NOT NULL,
    "ownerId" TEXT,
    "escalationContact" TEXT,
    "procedure" TEXT,
    "scope" TEXT,
    "criticality" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupportService_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SupportService_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SupportService_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SupportService" ("contractId", "createdAt", "criticality", "id", "notes", "scope", "title", "updatedAt", "vendorId") SELECT "contractId", "createdAt", "criticality", "id", "notes", "scope", "title", "updatedAt", "vendorId" FROM "SupportService";
DROP TABLE "SupportService";
ALTER TABLE "new_SupportService" RENAME TO "SupportService";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'APPRENTI',
    "tenantId" TEXT,
    "objectId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "updatedAt") SELECT "createdAt", "email", "id", "name", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_tenantId_objectId_key" ON "User"("tenantId", "objectId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClaudeToken_hash_key" ON "ClaudeToken"("hash");

-- CreateIndex
CREATE INDEX "ServiceControl_serviceId_checkedAt_idx" ON "ServiceControl"("serviceId", "checkedAt");

