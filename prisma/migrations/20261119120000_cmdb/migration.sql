CREATE TABLE "ConfigurationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "reference" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "environment" TEXT NOT NULL DEFAULT 'PRODUCTION',
    "criticality" TEXT NOT NULL DEFAULT 'STANDARD',
    "owner" TEXT,
    "description" TEXT,
    "serviceId" TEXT,
    "vendorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ConfigurationItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "SupportService" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ConfigurationItem_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "ConfigurationRelation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    CONSTRAINT "ConfigurationRelation_distinct_items" CHECK ("sourceId" <> "targetId"),
    CONSTRAINT "ConfigurationRelation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ConfigurationItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConfigurationRelation_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "ConfigurationItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ConfigurationItem_reference_key" ON "ConfigurationItem"("reference");
CREATE INDEX "ConfigurationItem_serviceId_idx" ON "ConfigurationItem"("serviceId");
CREATE INDEX "ConfigurationItem_vendorId_idx" ON "ConfigurationItem"("vendorId");
CREATE UNIQUE INDEX "ConfigurationRelation_sourceId_targetId_type_key" ON "ConfigurationRelation"("sourceId", "targetId", "type");
CREATE INDEX "ConfigurationRelation_targetId_idx" ON "ConfigurationRelation"("targetId");
