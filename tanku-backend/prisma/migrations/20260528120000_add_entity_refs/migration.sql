-- Referencias legibles (ORD-2026-0001842, RCL-…, USR-…)

CREATE TABLE IF NOT EXISTS "entity_ref_sequences" (
    "entity_type" TEXT NOT NULL,
    "year" INTEGER NOT NULL DEFAULT 0,
    "last_value" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "entity_ref_sequences_pkey" PRIMARY KEY ("entity_type", "year")
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'ref'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "ref" TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'ref'
    ) THEN
        ALTER TABLE "orders" ADD COLUMN "ref" TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'support_cases' AND column_name = 'ref'
    ) THEN
        ALTER TABLE "support_cases" ADD COLUMN "ref" TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'posters' AND column_name = 'ref'
    ) THEN
        ALTER TABLE "posters" ADD COLUMN "ref" TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'wish_lists' AND column_name = 'ref'
    ) THEN
        ALTER TABLE "wish_lists" ADD COLUMN "ref" TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'ref'
    ) THEN
        ALTER TABLE "events" ADD COLUMN "ref" TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'stalker_gifts' AND column_name = 'ref'
    ) THEN
        ALTER TABLE "stalker_gifts" ADD COLUMN "ref" TEXT;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "users_ref_key" ON "users"("ref") WHERE "ref" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "orders_ref_key" ON "orders"("ref") WHERE "ref" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "support_cases_ref_key" ON "support_cases"("ref") WHERE "ref" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "posters_ref_key" ON "posters"("ref") WHERE "ref" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "wish_lists_ref_key" ON "wish_lists"("ref") WHERE "ref" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "events_ref_key" ON "events"("ref") WHERE "ref" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "stalker_gifts_ref_key" ON "stalker_gifts"("ref") WHERE "ref" IS NOT NULL;
