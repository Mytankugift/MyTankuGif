-- Postventa MVP: support_cases + support_case_events

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupportCaseType') THEN
        CREATE TYPE "SupportCaseType" AS ENUM ('NOT_RECEIVED', 'DAMAGED', 'DELAY', 'WRONG_ITEM', 'OTHER');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupportCaseStatus') THEN
        CREATE TYPE "SupportCaseStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'WAITING_USER', 'RESOLVED', 'CLOSED');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupportCaseEventKind') THEN
        CREATE TYPE "SupportCaseEventKind" AS ENUM ('CREATED', 'STATUS_CHANGED', 'PUBLIC_MESSAGE', 'INTERNAL_NOTE', 'DROPI_REFRESH');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupportCaseActorType') THEN
        CREATE TYPE "SupportCaseActorType" AS ENUM ('USER', 'ADMIN', 'SYSTEM');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "support_cases" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "order_item_id" TEXT,
    "case_type" "SupportCaseType" NOT NULL,
    "status" "SupportCaseStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "support_cases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "support_case_events" (
    "id" TEXT NOT NULL,
    "support_case_id" TEXT NOT NULL,
    "kind" "SupportCaseEventKind" NOT NULL,
    "payload" JSONB,
    "actor_type" "SupportCaseActorType" NOT NULL,
    "actor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "support_case_events_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'support_cases_user_id_fkey'
    ) THEN
        ALTER TABLE "support_cases" ADD CONSTRAINT "support_cases_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'support_cases_order_id_fkey'
    ) THEN
        ALTER TABLE "support_cases" ADD CONSTRAINT "support_cases_order_id_fkey"
            FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'support_cases_order_item_id_fkey'
    ) THEN
        ALTER TABLE "support_cases" ADD CONSTRAINT "support_cases_order_item_id_fkey"
            FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'support_case_events_support_case_id_fkey'
    ) THEN
        ALTER TABLE "support_case_events" ADD CONSTRAINT "support_case_events_support_case_id_fkey"
            FOREIGN KEY ("support_case_id") REFERENCES "support_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "support_cases_user_id_status_idx" ON "support_cases"("user_id", "status");
CREATE INDEX IF NOT EXISTS "support_cases_order_id_idx" ON "support_cases"("order_id");
CREATE INDEX IF NOT EXISTS "support_cases_status_created_at_idx" ON "support_cases"("status", "created_at");
CREATE INDEX IF NOT EXISTS "support_case_events_support_case_id_created_at_idx" ON "support_case_events"("support_case_id", "created_at");
