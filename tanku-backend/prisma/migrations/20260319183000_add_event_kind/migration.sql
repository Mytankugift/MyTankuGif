-- Enum EventKind + columna events.kind (idempotente)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EventKind') THEN
        CREATE TYPE "EventKind" AS ENUM ('CELEBRATION', 'EVENT');
        RAISE NOTICE 'Tipo EventKind creado';
    ELSE
        RAISE NOTICE 'Tipo EventKind ya existe, omitiendo';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'events'
          AND column_name = 'kind'
    ) THEN
        ALTER TABLE "events" ADD COLUMN "kind" "EventKind" NOT NULL DEFAULT 'EVENT';
        RAISE NOTICE 'Columna events.kind agregada';
    ELSE
        RAISE NOTICE 'Columna events.kind ya existe, omitiendo';
    END IF;
END $$;
