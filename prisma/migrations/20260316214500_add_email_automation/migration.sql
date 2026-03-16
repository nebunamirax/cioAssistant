ALTER TABLE "Email" ADD COLUMN "categoriesJson" TEXT;
ALTER TABLE "Email" ADD COLUMN "automationStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Email" ADD COLUMN "automationSummary" TEXT;
ALTER TABLE "Email" ADD COLUMN "automationError" TEXT;
ALTER TABLE "Email" ADD COLUMN "automationResultJson" TEXT;
ALTER TABLE "Email" ADD COLUMN "automatedAt" DATETIME;
