-- ============================================
-- Ajustar DropiRawProduct
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'dropi_raw_products'
  ) THEN

    ALTER TABLE "dropi_raw_products"
      ADD COLUMN IF NOT EXISTS "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

    ALTER TABLE "dropi_raw_products"
      DROP COLUMN IF EXISTS "normalized_at";

    CREATE INDEX IF NOT EXISTS "dropi_raw_products_dropi_id_idx"
      ON "dropi_raw_products"("dropi_id");

    CREATE INDEX IF NOT EXISTS "dropi_raw_products_source_idx"
      ON "dropi_raw_products"("source");

    CREATE INDEX IF NOT EXISTS "dropi_raw_products_synced_at_idx"
      ON "dropi_raw_products"("synced_at");

    CREATE UNIQUE INDEX IF NOT EXISTS "dropi_raw_products_dropi_id_source_key"
      ON "dropi_raw_products"("dropi_id", "source");

  END IF;
END $$;

-- ============================================
-- Ajustar DropiProduct (images TEXT[] -> JSONB)
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'dropi_products'
  ) THEN

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'dropi_products'
        AND column_name = 'images'
        AND data_type = 'ARRAY'
    ) THEN
      ALTER TABLE "dropi_products"
        ALTER COLUMN "images" TYPE JSONB
        USING
          CASE
            WHEN "images" IS NULL THEN NULL
            WHEN "images" = '{}' THEN '[]'::jsonb
            ELSE to_jsonb("images")
          END;
    END IF;

    ALTER TABLE "dropi_products"
      ADD COLUMN IF NOT EXISTS "main_image_s3_path" TEXT,
      ADD COLUMN IF NOT EXISTS "category_dropi_ids" JSONB,
      ADD COLUMN IF NOT EXISTS "last_synced_at" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "last_price_stock_sync_at" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "description_synced_at" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "suggested_price" INTEGER;

    ALTER TABLE "dropi_products"
      ALTER COLUMN "description" TYPE TEXT;

    CREATE INDEX IF NOT EXISTS "dropi_products_category_dropi_id_idx"
      ON "dropi_products"("category_dropi_id");

  END IF;
END $$;

-- ============================================
-- Crear tabla WarehouseVariant
-- ============================================

CREATE TABLE IF NOT EXISTS "warehouse_variants" (
  "id" TEXT NOT NULL,
  "variant_id" TEXT NOT NULL,
  "warehouse_id" INTEGER NOT NULL,
  "warehouse_name" TEXT,
  "warehouse_city" TEXT,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "warehouse_variants_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "warehouse_variants_variant_id_idx"
  ON "warehouse_variants"("variant_id");

CREATE INDEX IF NOT EXISTS "warehouse_variants_warehouse_id_idx"
  ON "warehouse_variants"("warehouse_id");

CREATE UNIQUE INDEX IF NOT EXISTS "warehouse_variants_variant_id_warehouse_id_key"
  ON "warehouse_variants"("variant_id", "warehouse_id");

-- ============================================
-- Migrar stock desde ProductVariant (SAFE)
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'product_variants'
  ) THEN

    INSERT INTO "warehouse_variants" (
      "id",
      "variant_id",
      "warehouse_id",
      "warehouse_name",
      "stock",
      "created_at",
      "updated_at"
    )
    SELECT
      'c' || substr(md5(random()::text || clock_timestamp()::text), 1, 24),
      "id",
      0,
      'Stock General',
      COALESCE("stock", 0),
      "created_at",
      "updated_at"
    FROM "product_variants"
    WHERE "stock" IS NOT NULL
      AND "stock" > 0
    ON CONFLICT ("variant_id", "warehouse_id") DO NOTHING;

  END IF;
END $$;

-- ============================================
-- Foreign key WarehouseVariant -> ProductVariant
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'product_variants'
  ) THEN

    ALTER TABLE "warehouse_variants"
      ADD CONSTRAINT "warehouse_variants_variant_id_fkey"
      FOREIGN KEY ("variant_id")
      REFERENCES "product_variants"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;

  END IF;
END $$;

-- ============================================
-- Agregar suggested_price a ProductVariant
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'product_variants'
  ) THEN

    ALTER TABLE "product_variants"
      ADD COLUMN IF NOT EXISTS "suggested_price" INTEGER;

  END IF;
END $$;

-- ============================================
-- NOTA
-- ============================================
-- El campo stock de product_variants NO se elimina aún
-- Se removerá en una migración posterior
