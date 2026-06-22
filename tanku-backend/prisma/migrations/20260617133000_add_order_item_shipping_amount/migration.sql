-- Envío puro de la transportadora (shipping_amount de Dropi) a nivel de order_item.
-- Separa el "envío real" del "costo total Dropi" (discounted_amount), que ya vive en dropi_shipping_cost.
-- Production-safe: IF NOT EXISTS.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'order_items'
        AND column_name = 'dropi_shipping_amount'
    ) THEN
        ALTER TABLE "order_items" ADD COLUMN "dropi_shipping_amount" INTEGER DEFAULT 0;
        RAISE NOTICE 'Columna dropi_shipping_amount agregada a order_items';
    ELSE
        RAISE NOTICE 'Columna dropi_shipping_amount ya existe, omitiendo';
    END IF;
END $$;
