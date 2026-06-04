-- Registro de purga de evidencias por retención (S3 + adjuntos)
ALTER TABLE "support_cases"
ADD COLUMN IF NOT EXISTS "evidence_purged_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "evidence_purged_retention_days" INTEGER;
