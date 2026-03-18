-- Índice para ordenar conversaciones por última actividad (tras crear la tabla en 20260204140810)
CREATE INDEX IF NOT EXISTS "conversations_updated_at_idx" ON "conversations"("updated_at");
