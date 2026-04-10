DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaskPriority') THEN
        CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "StaffUser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StaffUser_email_key" ON "StaffUser"("email");
CREATE INDEX IF NOT EXISTS "StaffUser_isActive_name_idx" ON "StaffUser"("isActive", "name");

ALTER TABLE "CheckTypeProgress"
    ADD COLUMN IF NOT EXISTS "serviceKey" TEXT,
    ADD COLUMN IF NOT EXISTS "serviceLabel" TEXT;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'CheckTypeProgress' AND column_name = 'checkName'
    ) THEN
        UPDATE "CheckTypeProgress"
        SET
            "serviceLabel" = COALESCE("serviceLabel", "checkName"),
            "serviceKey" = COALESCE(
                "serviceKey",
                CASE "checkName"
                    WHEN 'Individual & Identity Checks' THEN 'IDENTITY_CHECKS'
                    WHEN 'Verification Services' THEN 'VERIFICATION_SERVICES'
                    WHEN 'Legal & Immigration Checks' THEN 'LEGAL_IMMIGRATION_CHECKS'
                    WHEN 'Corporate & Financial Checks' THEN 'CORPORATE_FINANCIAL_CHECKS'
                    WHEN 'Specialized Checks' THEN 'SPECIALIZED_CHECKS'
                    ELSE UPPER(REGEXP_REPLACE("checkName", '[^A-Za-z0-9]+', '_', 'g'))
                END
            );
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'CheckTypeProgress' AND column_name = 'checkType'
    ) THEN
        UPDATE "CheckTypeProgress"
        SET
            "serviceKey" = COALESCE("serviceKey", "checkType"::text),
            "serviceLabel" = COALESCE(
                "serviceLabel",
                CASE "checkType"::text
                    WHEN 'IDENTITY_CHECKS' THEN 'Individual & Identity Checks'
                    WHEN 'VERIFICATION_SERVICES' THEN 'Verification Services'
                    WHEN 'LEGAL_IMMIGRATION_CHECKS' THEN 'Legal & Immigration Checks'
                    WHEN 'CORPORATE_FINANCIAL_CHECKS' THEN 'Corporate & Financial Checks'
                    WHEN 'SPECIALIZED_CHECKS' THEN 'Specialized Checks'
                    ELSE "checkType"::text
                END
            );
    END IF;
END $$;

UPDATE "CheckTypeProgress"
SET
    "serviceKey" = COALESCE("serviceKey", UPPER(REGEXP_REPLACE(COALESCE("serviceLabel", 'SERVICE'), '[^A-Za-z0-9]+', '_', 'g'))),
    "serviceLabel" = COALESCE("serviceLabel", "serviceKey", 'Service');

ALTER TABLE "CheckTypeProgress"
    ALTER COLUMN "serviceKey" SET NOT NULL,
    ALTER COLUMN "serviceLabel" SET NOT NULL;

DROP INDEX IF EXISTS "CheckTypeProgress_orderProgressId_checkType_key";
DROP INDEX IF EXISTS "CheckTypeProgress_checkType_idx";
DROP INDEX IF EXISTS "CheckTypeProgress_orderProgressId_checkName_key";

CREATE UNIQUE INDEX IF NOT EXISTS "CheckTypeProgress_orderProgressId_serviceKey_key"
ON "CheckTypeProgress"("orderProgressId", "serviceKey");

CREATE INDEX IF NOT EXISTS "CheckTypeProgress_serviceKey_idx"
ON "CheckTypeProgress"("serviceKey");

ALTER TABLE "CheckTask"
    ADD COLUMN IF NOT EXISTS "assigneeId" TEXT,
    ADD COLUMN IF NOT EXISTS "description" TEXT,
    ADD COLUMN IF NOT EXISTS "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'CheckTask_assigneeId_fkey'
    ) THEN
        ALTER TABLE "CheckTask"
        ADD CONSTRAINT "CheckTask_assigneeId_fkey"
        FOREIGN KEY ("assigneeId") REFERENCES "StaffUser"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "CheckTask_assigneeId_idx" ON "CheckTask"("assigneeId");
CREATE INDEX IF NOT EXISTS "CheckTask_status_priority_idx" ON "CheckTask"("status", "priority");
