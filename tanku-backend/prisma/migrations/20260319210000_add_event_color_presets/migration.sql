-- user_profiles.event_color_presets (JSON, idempotente)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_profiles'
          AND column_name = 'event_color_presets'
    ) THEN
        ALTER TABLE "user_profiles" ADD COLUMN "event_color_presets" JSONB;
        RAISE NOTICE 'Columna user_profiles.event_color_presets agregada';
    ELSE
        RAISE NOTICE 'Columna user_profiles.event_color_presets ya existe, omitiendo';
    END IF;
END $$;
