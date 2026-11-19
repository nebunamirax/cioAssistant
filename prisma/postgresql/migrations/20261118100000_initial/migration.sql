-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'APPRENTI',
    "tenantId" TEXT,
    "objectId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "ownerId" TEXT,
    "startDate" TIMESTAMP(3),
    "targetDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "objectiveId" TEXT,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Action" (
    "id" TEXT NOT NULL,
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
    "dueDate" TIMESTAMP(3),
    "projectId" TEXT,
    "contractId" TEXT,
    "vendorId" TEXT,
    "sourceType" TEXT,
    "sourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "mainContactName" TEXT,
    "mainContactEmail" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "contractType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "noticePeriodDays" INTEGER,
    "amountPlanned" DOUBLE PRECISION,
    "notes" TEXT,
    "renewalType" TEXT NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportService" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT,
    "contractId" TEXT,
    "title" TEXT NOT NULL,
    "ownerId" TEXT,
    "escalationContact" TEXT,
    "procedure" TEXT,
    "scope" TEXT,
    "criticality" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "projectId" TEXT,
    "contractId" TEXT,
    "vendorId" TEXT,
    "fiscalYear" INTEGER,
    "plannedAmount" DOUBLE PRECISION,
    "committedAmount" DOUBLE PRECISION,
    "estimatedActualAmount" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Communication" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "templateKey" TEXT,
    "inputDataJson" TEXT,
    "contentText" TEXT,
    "contentMarkdown" TEXT,
    "projectId" TEXT,
    "actionId" TEXT,
    "contractId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Communication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingNote" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "meetingDate" TIMESTAMP(3) NOT NULL,
    "attendeesJson" TEXT,
    "rawContent" TEXT NOT NULL,
    "summary" TEXT,
    "extractedActionsJson" TEXT,
    "extractedDecisionsJson" TEXT,
    "extractedRisksJson" TEXT,
    "extractedDeadlinesJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Email" (
    "id" TEXT NOT NULL,
    "externalMessageId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "snippet" TEXT,
    "linkedProjectId" TEXT,
    "linkedActionId" TEXT,
    "categoriesJson" TEXT,
    "automationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "automationSummary" TEXT,
    "automationError" TEXT,
    "automationResultJson" TEXT,
    "automatedAt" TIMESTAMP(3),
    "rawMetadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIJob" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceEntityId" TEXT NOT NULL,
    "providerMode" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "inputText" TEXT NOT NULL,
    "outputJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIIntakeReview" (
    "id" TEXT NOT NULL,
    "sourceName" TEXT,
    "rawText" TEXT NOT NULL,
    "providerMode" TEXT NOT NULL,
    "providerLabel" TEXT NOT NULL,
    "providerModel" TEXT NOT NULL,
    "summary" TEXT,
    "suggestedModulesJson" TEXT,
    "analysisJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewReason" TEXT,
    "selectedModule" TEXT,
    "draftDataJson" TEXT,
    "createdEntityType" TEXT,
    "createdEntityId" TEXT,
    "createdEntityHref" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIIntakeReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Risk" (
    "meetingNoteId" TEXT,
    "id" TEXT NOT NULL,
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
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Risk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "meetingNoteId" TEXT,
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "context" TEXT,
    "optionsJson" TEXT,
    "recommendation" TEXT,
    "decider" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "targetDate" TIMESTAMP(3),
    "projectId" TEXT,
    "contractId" TEXT,
    "budgetItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategicObjective" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerName" TEXT,
    "targetDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategicObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalSource" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "projectId" TEXT,
    "serviceId" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "statusMappings" TEXT,

    CONSTRAINT "ExternalSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalItem" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "originalStatus" TEXT,
    "assignees" TEXT NOT NULL DEFAULT '',
    "priority" TEXT,
    "dueDate" TIMESTAMP(3),
    "major" BOOLEAN NOT NULL DEFAULT false,
    "progress" INTEGER,
    "url" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "hash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "failures" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaudeToken" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "scope" TEXT NOT NULL DEFAULT 'PILOTAGE',
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ClaudeToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaudeWrite" (
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClaudeWrite_pkey" PRIMARY KEY ("userId","key")
);

-- CreateTable
CREATE TABLE "ServiceControl" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL,
    "result" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "nextDueAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'TODO',

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyReport" (
    "month" TEXT NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "draft" TEXT NOT NULL,
    "archive" TEXT,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "MonthlyReport_pkey" PRIMARY KEY ("month")
);

-- CreateTable
CREATE TABLE "PmoImport" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PmoImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspacePage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "parentId" TEXT,
    "contentMarkdown" TEXT NOT NULL DEFAULT '',
    "blocksJson" TEXT NOT NULL DEFAULT '[]',
    "viewsJson" TEXT NOT NULL DEFAULT '[]',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "editedById" TEXT NOT NULL,
    "editedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspacePage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceRevision" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "parentId" TEXT,
    "contentMarkdown" TEXT NOT NULL,
    "blocksJson" TEXT NOT NULL,
    "viewsJson" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_objectId_key" ON "User"("tenantId", "objectId");

-- CreateIndex
CREATE INDEX "Project_objectiveId_idx" ON "Project"("objectiveId");

-- CreateIndex
CREATE UNIQUE INDEX "Action_externalItemId_key" ON "Action"("externalItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Email_externalMessageId_key" ON "Email"("externalMessageId");

-- CreateIndex
CREATE INDEX "ExternalSource_projectId_idx" ON "ExternalSource"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalSource_kind_key_key" ON "ExternalSource"("kind", "key");

-- CreateIndex
CREATE INDEX "ExternalItem_status_dueDate_idx" ON "ExternalItem"("status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalItem_sourceId_externalId_key" ON "ExternalItem"("sourceId", "externalId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClaudeToken_hash_key" ON "ClaudeToken"("hash");

-- CreateIndex
CREATE INDEX "ServiceControl_serviceId_checkedAt_idx" ON "ServiceControl"("serviceId", "checkedAt");

-- CreateIndex
CREATE INDEX "WorkspacePage_parentId_title_id_idx" ON "WorkspacePage"("parentId", "title", "id");

-- CreateIndex
CREATE INDEX "WorkspacePage_updatedAt_id_idx" ON "WorkspacePage"("updatedAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceRevision_pageId_revision_key" ON "WorkspaceRevision"("pageId", "revision");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "StrategicObjective"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "SupportService"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_externalItemId_fkey" FOREIGN KEY ("externalItemId") REFERENCES "ExternalItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_meetingNoteId_fkey" FOREIGN KEY ("meetingNoteId") REFERENCES "MeetingNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportService" ADD CONSTRAINT "SupportService_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportService" ADD CONSTRAINT "SupportService_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportService" ADD CONSTRAINT "SupportService_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingNote" ADD CONSTRAINT "MeetingNote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_linkedProjectId_fkey" FOREIGN KEY ("linkedProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_linkedActionId_fkey" FOREIGN KEY ("linkedActionId") REFERENCES "Action"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_meetingNoteId_fkey" FOREIGN KEY ("meetingNoteId") REFERENCES "MeetingNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_meetingNoteId_fkey" FOREIGN KEY ("meetingNoteId") REFERENCES "MeetingNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_budgetItemId_fkey" FOREIGN KEY ("budgetItemId") REFERENCES "BudgetItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalSource" ADD CONSTRAINT "ExternalSource_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "SupportService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalSource" ADD CONSTRAINT "ExternalSource_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalItem" ADD CONSTRAINT "ExternalItem_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ExternalSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaudeToken" ADD CONSTRAINT "ClaudeToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceControl" ADD CONSTRAINT "ServiceControl_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "SupportService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspacePage" ADD CONSTRAINT "WorkspacePage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WorkspacePage"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "WorkspaceRevision" ADD CONSTRAINT "WorkspaceRevision_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WorkspacePage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

