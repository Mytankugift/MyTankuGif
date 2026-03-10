-- CreateIndex: stories_user_customerId_isActive_expiresAt_idx
-- Índice compuesto para optimizar consultas del feed de stories
CREATE INDEX IF NOT EXISTS "stories_user_customerId_isActive_expiresAt_idx" ON "stories_user"("customer_id", "is_active", "expires_at");

