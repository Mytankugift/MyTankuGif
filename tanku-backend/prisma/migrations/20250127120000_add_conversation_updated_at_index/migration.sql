-- CreateIndex: conversations_updated_at_idx
-- Índice para optimizar ordenamiento por última actividad en conversaciones
-- Mejora el rendimiento de la query getConversations() que ordena por updatedAt
CREATE INDEX IF NOT EXISTS "conversations_updated_at_idx" ON "conversations"("updated_at");
