ALTER TABLE "CheckTask"
    ADD COLUMN IF NOT EXISTS "publicStepNumber" INTEGER;

CREATE INDEX IF NOT EXISTS "CheckTask_publicStepNumber_idx"
ON "CheckTask"("publicStepNumber");
