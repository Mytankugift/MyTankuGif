DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'dropi_jobs'
          AND column_name = 'metadata'
    ) THEN
        ALTER TABLE "dropi_jobs" ADD COLUMN "metadata" JSONB;
        RAISE NOTICE 'Columna metadata agregada en dropi_jobs';
    ELSE
        RAISE NOTICE 'Columna metadata ya existe en dropi_jobs';
    END IF;
END $$;
