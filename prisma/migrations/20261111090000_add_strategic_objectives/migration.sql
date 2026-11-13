CREATE TABLE "StrategicObjective" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerName" TEXT,
    "targetDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "Project" ADD COLUMN "objectiveId" TEXT REFERENCES "StrategicObjective"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Project_objectiveId_idx" ON "Project"("objectiveId");
