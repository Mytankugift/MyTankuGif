CREATE TABLE IF NOT EXISTS "support_case_attachments" (
    "id" TEXT NOT NULL,
    "support_case_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "support_case_attachments_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'support_case_attachments_support_case_id_fkey'
    ) THEN
        ALTER TABLE "support_case_attachments" ADD CONSTRAINT "support_case_attachments_support_case_id_fkey"
            FOREIGN KEY ("support_case_id") REFERENCES "support_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "support_case_attachments_support_case_id_idx" ON "support_case_attachments"("support_case_id");
