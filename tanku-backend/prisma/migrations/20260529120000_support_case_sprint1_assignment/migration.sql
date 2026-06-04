-- Sprint 1 postventa: asignación admin, INCOMPLETE (sin OTHER), CASE_ASSIGNED

ALTER TYPE "SupportCaseEventKind" ADD VALUE IF NOT EXISTS 'CASE_ASSIGNED';

CREATE TYPE "SupportCaseType_new" AS ENUM (
  'NOT_RECEIVED',
  'DAMAGED',
  'DELAY',
  'WRONG_ITEM',
  'INCOMPLETE'
);

ALTER TABLE "support_cases"
  ALTER COLUMN "case_type" TYPE "SupportCaseType_new"
  USING (
    CASE "case_type"::text
      WHEN 'OTHER' THEN 'INCOMPLETE'::"SupportCaseType_new"
      ELSE "case_type"::text::"SupportCaseType_new"
    END
  );

DROP TYPE "SupportCaseType";
ALTER TYPE "SupportCaseType_new" RENAME TO "SupportCaseType";

ALTER TABLE "support_cases"
  ADD COLUMN IF NOT EXISTS "assigned_admin_user_id" TEXT,
  ADD COLUMN IF NOT EXISTS "assigned_at" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'support_cases_assigned_admin_user_id_fkey'
  ) THEN
    ALTER TABLE "support_cases"
      ADD CONSTRAINT "support_cases_assigned_admin_user_id_fkey"
      FOREIGN KEY ("assigned_admin_user_id") REFERENCES "admin_users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "support_cases_assigned_admin_user_id_status_idx"
  ON "support_cases"("assigned_admin_user_id", "status");
