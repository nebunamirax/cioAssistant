-- CreateTable
CREATE TABLE "WorkspacePage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "parentId" TEXT,
    "contentMarkdown" TEXT NOT NULL DEFAULT '',
    "blocksJson" TEXT NOT NULL DEFAULT '[]',
    "viewsJson" TEXT NOT NULL DEFAULT '[]',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "editedById" TEXT NOT NULL,
    "editedByName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkspacePage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WorkspacePage" ("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);

-- CreateTable
CREATE TABLE "WorkspaceRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "parentId" TEXT,
    "contentMarkdown" TEXT NOT NULL,
    "blocksJson" TEXT NOT NULL,
    "viewsJson" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkspaceRevision_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WorkspacePage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WorkspacePage_parentId_title_id_idx" ON "WorkspacePage"("parentId", "title", "id");

-- CreateIndex
CREATE INDEX "WorkspacePage_updatedAt_id_idx" ON "WorkspacePage"("updatedAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceRevision_pageId_revision_key" ON "WorkspaceRevision"("pageId", "revision");

