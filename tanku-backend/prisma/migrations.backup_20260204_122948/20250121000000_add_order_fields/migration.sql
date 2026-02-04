-- ============================================
-- Agregar campos faltantes a Order (shadow-safe)
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'orders'
  ) THEN

    -- Agregar email (primero como nullable, luego actualizar y hacer NOT NULL)
    ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "email" TEXT;

    -- Actualizar email desde users si existe
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'users'
    ) THEN
      UPDATE "orders" o
      SET "email" = u.email
      FROM "users" u
      WHERE o.user_id = u.id
        AND (o.email IS NULL OR o.email = '');
    END IF;

    -- Si aún hay NULLs, usar un valor por defecto
    UPDATE "orders"
    SET "email" = 'unknown@example.com'
    WHERE "email" IS NULL OR "email" = '';

    -- Ahora hacer el campo NOT NULL
    ALTER TABLE "orders"
      ALTER COLUMN "email" SET NOT NULL,
      ALTER COLUMN "email" SET DEFAULT '';

    -- Agregar subtotal
    ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "subtotal" INTEGER NOT NULL DEFAULT 0;

    -- Agregar shipping_total
    ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "shipping_total" INTEGER NOT NULL DEFAULT 0;

    -- Agregar dropi_order_id
    ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "dropi_order_id" INTEGER;

    -- Agregar is_stalker_gift
    ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "is_stalker_gift" BOOLEAN NOT NULL DEFAULT false;

    -- Agregar transaction_id
    ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "transaction_id" TEXT;

    -- Agregar metadata
    ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "metadata" JSONB;

    -- Crear índices
    CREATE INDEX IF NOT EXISTS "orders_user_id_idx" ON "orders"("user_id");
    CREATE INDEX IF NOT EXISTS "orders_email_idx" ON "orders"("email");
    CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders"("status");
    CREATE INDEX IF NOT EXISTS "orders_payment_status_idx" ON "orders"("payment_status");
    CREATE INDEX IF NOT EXISTS "orders_dropi_order_id_idx" ON "orders"("dropi_order_id");

  END IF;
END $$;
