-- AlterTable events.color (seguro para reproducción / producción)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'events'
          AND column_name = 'color'
    ) THEN
        ALTER TABLE "events" ADD COLUMN "color" VARCHAR(7) NOT NULL DEFAULT '#73FFA2';
        RAISE NOTICE 'Columna events.color agregada';
    ELSE
        RAISE NOTICE 'Columna events.color ya existe, omitiendo';
    END IF;
END $$;
