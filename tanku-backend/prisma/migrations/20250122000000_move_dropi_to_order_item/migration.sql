-- ============================================
-- Mover información de Dropi de Order a OrderItem (shadow-safe)
-- ============================================

DO $$
BEGIN
  -- 1. Verificar que exista order_items
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'order_items'
  ) THEN

    -- Agregar nuevos campos a order_items
    ALTER TABLE "order_items"
      ADD COLUMN IF NOT EXISTS "final_price" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "dropi_order_id" INTEGER,
      ADD COLUMN IF NOT EXISTS "dropi_order_number" INTEGER,
      ADD COLUMN IF NOT EXISTS "dropi_shipping_cost" INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "dropi_status" TEXT,
      ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

    -- Actualizar final_price desde price usando la fórmula: (price * 1.15) + 10,000
    -- Solo si las columnas necesarias existen
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'order_items'
        AND column_name = 'price'
    ) AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'order_items'
        AND column_name = 'final_price'
    ) THEN
      UPDATE "order_items"
      SET "final_price" = ROUND(("price" * 1.15) + 10000)
      WHERE "final_price" = 0;
    END IF;

    -- Migrar dropi_order_id de orders si orders existe y tiene la columna
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'orders'
    ) AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'orders'
        AND column_name = 'dropi_order_id'
    ) AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'order_items'
        AND column_name = 'dropi_order_id'
    ) THEN
      UPDATE "order_items" oi
      SET "dropi_order_id" = o."dropi_order_id"
      FROM "orders" o
      WHERE oi.order_id = o.id
        AND o."dropi_order_id" IS NOT NULL
        AND oi."dropi_order_id" IS NULL;
    END IF;

    -- Crear índices en order_items
    CREATE INDEX IF NOT EXISTS "order_items_dropi_order_id_idx"
      ON "order_items"("dropi_order_id");

    CREATE INDEX IF NOT EXISTS "order_items_dropi_order_number_idx"
      ON "order_items"("dropi_order_number");

  END IF;
END $$;

-- ============================================
-- Eliminar dropi_order_id de orders (shadow-safe)
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'orders'
  ) THEN
    DROP INDEX IF EXISTS "orders_dropi_order_id_idx";
    ALTER TABLE "orders"
      DROP COLUMN IF EXISTS "dropi_order_id";
  END IF;
END $$;
