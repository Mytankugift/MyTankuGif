-- Costo del proveedor (supplier_price de Dropi) a nivel de order_item.
-- Production-safe: IF NOT EXISTS.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'order_items'
        AND column_name = 'dropi_supplier_cost'
    ) THEN
        ALTER TABLE "order_items" ADD COLUMN "dropi_supplier_cost" INTEGER DEFAULT 0;
        RAISE NOTICE 'Columna dropi_supplier_cost agregada a order_items';
    ELSE
        RAISE NOTICE 'Columna dropi_supplier_cost ya existe, omitiendo';
    END IF;
END $$;
