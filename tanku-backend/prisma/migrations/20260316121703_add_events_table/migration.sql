-- CreateEnum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RepeatType') THEN
        CREATE TYPE "RepeatType" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');
        RAISE NOTICE 'Enum RepeatType creado exitosamente';
    ELSE
        RAISE NOTICE 'Enum RepeatType ya existe, omitiendo';
    END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "event_date" TIMESTAMP(3) NOT NULL,
    "repeat_type" "RepeatType" NOT NULL DEFAULT 'NONE',
    "reminders" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "events_user_id_event_date_idx" ON "events"("user_id", "event_date");
CREATE INDEX IF NOT EXISTS "events_user_id_is_active_idx" ON "events"("user_id", "is_active");
CREATE INDEX IF NOT EXISTS "events_event_date_idx" ON "events"("event_date");

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'events_user_id_fkey'
    ) THEN
        ALTER TABLE "events" 
        ADD CONSTRAINT "events_user_id_fkey" 
        FOREIGN KEY ("user_id") 
        REFERENCES "users"("id") 
        ON DELETE CASCADE;
        RAISE NOTICE 'Foreign key events_user_id_fkey agregado exitosamente';
    ELSE
        RAISE NOTICE 'Foreign key events_user_id_fkey ya existe, omitiendo';
    END IF;
END $$;

