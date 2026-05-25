-- Separar intentos de enrich (429) del last_synced_at que antes ponía normalize
ALTER TABLE "dropi_products" ADD COLUMN IF NOT EXISTS "last_enrich_attempt_at" TIMESTAMP(3);
