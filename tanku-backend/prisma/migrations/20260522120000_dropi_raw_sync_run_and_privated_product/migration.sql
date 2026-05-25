-- sync_run_id en dropi_raw_products (limpieza post-RAW exitoso)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'dropi_raw_products'
          AND column_name = 'sync_run_id'
    ) THEN
        ALTER TABLE "dropi_raw_products" ADD COLUMN "sync_run_id" TEXT;
        RAISE NOTICE 'Columna sync_run_id agregada en dropi_raw_products';
    ELSE
        RAISE NOTICE 'Columna sync_run_id ya existe en dropi_raw_products';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "dropi_raw_products_sync_run_id_idx"
    ON "dropi_raw_products"("sync_run_id");

-- privated_product en dropi_products
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'dropi_products'
          AND column_name = 'privated_product'
    ) THEN
        ALTER TABLE "dropi_products" ADD COLUMN "privated_product" BOOLEAN NOT NULL DEFAULT false;
        RAISE NOTICE 'Columna privated_product agregada en dropi_products';
    ELSE
        RAISE NOTICE 'Columna privated_product ya existe en dropi_products';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "dropi_products_privated_product_idx"
    ON "dropi_products"("privated_product");
