CREATE TABLE "ExternalSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "lastSyncedAt" DATETIME,
    "statusMappings" TEXT,
    CONSTRAINT "ExternalSource_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ExternalItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "originalStatus" TEXT,
    "assignees" TEXT NOT NULL DEFAULT '',
    "priority" TEXT,
    "dueDate" DATETIME,
    "progress" INTEGER,
    "url" TEXT,
    "lastSyncedAt" DATETIME NOT NULL,
    CONSTRAINT "ExternalItem_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ExternalSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ExternalSource_kind_key_key" ON "ExternalSource"("kind", "key");
CREATE INDEX "ExternalSource_projectId_idx" ON "ExternalSource"("projectId");
CREATE UNIQUE INDEX "ExternalItem_sourceId_externalId_key" ON "ExternalItem"("sourceId", "externalId");
CREATE INDEX "ExternalItem_status_dueDate_idx" ON "ExternalItem"("status", "dueDate");
