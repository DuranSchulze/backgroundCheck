DROP TABLE IF EXISTS "TrackingLog";
DROP TABLE IF EXISTS "CheckProcess";
DROP TABLE IF EXISTS "TrackingRecord";
DROP TABLE IF EXISTS "Order";

DROP TYPE IF EXISTS "TrackingStatus";

CREATE TYPE "ProgressStatus" AS ENUM (
    'QUEUED',
    'IN_PROGRESS',
    'ACTIVE_INVESTIGATION',
    'COMPLETED',
    'ON_HOLD'
);

CREATE TYPE "CheckCategory" AS ENUM (
    'IDENTITY_CHECKS',
    'VERIFICATION_SERVICES',
    'LEGAL_IMMIGRATION_CHECKS',
    'CORPORATE_FINANCIAL_CHECKS',
    'SPECIALIZED_CHECKS'
);

CREATE TABLE "OrderProgress" (
    "id" TEXT NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "overallStatus" "ProgressStatus" NOT NULL DEFAULT 'QUEUED',
    "summary" TEXT,
    "etaLabel" TEXT,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CheckTypeProgress" (
    "id" TEXT NOT NULL,
    "orderProgressId" TEXT NOT NULL,
    "checkType" "CheckCategory" NOT NULL,
    "status" "ProgressStatus" NOT NULL DEFAULT 'QUEUED',
    "timelineLabel" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckTypeProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProgressActivity" (
    "id" TEXT NOT NULL,
    "orderProgressId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "highlight" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderProgress_trackingNumber_key" ON "OrderProgress"("trackingNumber");
CREATE INDEX "OrderProgress_overallStatus_idx" ON "OrderProgress"("overallStatus");
CREATE UNIQUE INDEX "CheckTypeProgress_orderProgressId_checkType_key" ON "CheckTypeProgress"("orderProgressId", "checkType");
CREATE INDEX "CheckTypeProgress_orderProgressId_idx" ON "CheckTypeProgress"("orderProgressId");
CREATE INDEX "CheckTypeProgress_checkType_idx" ON "CheckTypeProgress"("checkType");
CREATE INDEX "ProgressActivity_orderProgressId_createdAt_idx" ON "ProgressActivity"("orderProgressId", "createdAt");

ALTER TABLE "CheckTypeProgress"
ADD CONSTRAINT "CheckTypeProgress_orderProgressId_fkey"
FOREIGN KEY ("orderProgressId") REFERENCES "OrderProgress"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProgressActivity"
ADD CONSTRAINT "ProgressActivity_orderProgressId_fkey"
FOREIGN KEY ("orderProgressId") REFERENCES "OrderProgress"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
