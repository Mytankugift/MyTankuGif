-- Agrupación de notificaciones de interacción masiva (post_like / post_comment).
-- Añade group_key (nullable) y un índice único parcial-friendly (userId, group_key).
-- Los NULL no colisionan en Postgres, así las notificaciones no agrupadas no se ven afectadas.
-- Production-safe: IF NOT EXISTS.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'notifications'
        AND column_name = 'group_key'
    ) THEN
        ALTER TABLE "notifications" ADD COLUMN "group_key" TEXT;
        RAISE NOTICE 'Columna group_key agregada a notifications';
    ELSE
        RAISE NOTICE 'Columna group_key ya existe, omitiendo';
    END IF;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "notifications_user_id_group_key_key" ON "notifications"("user_id", "group_key");
