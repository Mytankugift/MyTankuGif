-- Tracking de eventos de comportamiento (append-only). Compartido por Analíticas
-- (Fase 3) e Inteligencia de Regalos. Sin FK a users (eventos anónimos / sobreviven al borrado).
-- Ver _meta/tracking-eventos.md.

CREATE TABLE IF NOT EXISTS "analytics_events" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'analytics_events_event_type_created_at_idx'
    ) THEN
        CREATE INDEX "analytics_events_event_type_created_at_idx" ON "analytics_events"("event_type", "created_at");
        RAISE NOTICE 'Index analytics_events_event_type_created_at_idx created';
    ELSE
        RAISE NOTICE 'Index analytics_events_event_type_created_at_idx already exists, skipping';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'analytics_events_entity_type_entity_id_idx'
    ) THEN
        CREATE INDEX "analytics_events_entity_type_entity_id_idx" ON "analytics_events"("entity_type", "entity_id");
        RAISE NOTICE 'Index analytics_events_entity_type_entity_id_idx created';
    ELSE
        RAISE NOTICE 'Index analytics_events_entity_type_entity_id_idx already exists, skipping';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'analytics_events_user_id_created_at_idx'
    ) THEN
        CREATE INDEX "analytics_events_user_id_created_at_idx" ON "analytics_events"("user_id", "created_at");
        RAISE NOTICE 'Index analytics_events_user_id_created_at_idx created';
    ELSE
        RAISE NOTICE 'Index analytics_events_user_id_created_at_idx already exists, skipping';
    END IF;
END $$;
