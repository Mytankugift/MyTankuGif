-- =============================================================================
-- RESET CATÁLOGO TANKU + DROPI (preproducción)
-- =============================================================================
-- Borra catálogo Dropi/Tanku y datos colgantes (ranking, carrito, wishlist, etc.).
-- NO borra: users, categories, dropi_categories, admin_users.
--
-- Uso (desde tanku-backend, con DATABASE_URL apuntando a la BD correcta):
--   psql "%DATABASE_URL%" -f scripts/reset-catalog-preprod.sql
--
-- Antes de ejecutar:
--   1. Parar workers y API (npm run workers:start / npm run dev)
--   2. Backup opcional en Railway
--   3. Confirmar favoritos marcados en Dropi antes de re-sincronizar
-- =============================================================================

BEGIN;

-- --- Feed / ranking / métricas (solo productos) ---
DELETE FROM global_ranking
WHERE item_type = 'product';

DELETE FROM item_metrics
WHERE item_type = 'product';

-- --- Carrito / wishlist / likes ---
DELETE FROM cart_items;

DELETE FROM wish_list_items;

DELETE FROM product_likes;

-- --- Stalker gifts (FK obligatoria a products) ---
DELETE FROM stalker_gifts;

-- --- Pedidos de prueba (suele estar vacío si no hay compras) ---
DELETE FROM order_items;

-- Descomentar solo si también queréis vaciar pedidos de prueba:
-- DELETE FROM order_addresses;
-- DELETE FROM orders;

-- --- Stories: desvincular producto ---
UPDATE stories_user
SET product_id = NULL,
    variant_id = NULL
WHERE product_id IS NOT NULL
   OR variant_id IS NOT NULL;

-- --- Tanku: bodegas, variantes, productos ---
DELETE FROM warehouse_variants;

DELETE FROM product_variants;

DELETE FROM products;

-- --- Capa Dropi ---
DELETE FROM dropi_products;

DELETE FROM dropi_raw_products;

-- --- Jobs Dropi activos (marcar fallidos; o borrar con DELETE) ---
UPDATE dropi_jobs
SET status = 'FAILED',
    error = COALESCE(error, 'Cancelado: reset catálogo preproducción'),
    finished_at = NOW()
WHERE status IN ('PENDING', 'RUNNING');

-- Alternativa: eliminar todos los jobs Dropi
-- DELETE FROM dropi_jobs;

COMMIT;

-- =============================================================================
-- Verificación (todas las filas deberían ser 0)
-- =============================================================================
SELECT 'dropi_raw_products' AS tabla, COUNT(*)::bigint AS filas FROM dropi_raw_products
UNION ALL SELECT 'dropi_products', COUNT(*) FROM dropi_products
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'product_variants', COUNT(*) FROM product_variants
UNION ALL SELECT 'warehouse_variants', COUNT(*) FROM warehouse_variants
UNION ALL SELECT 'cart_items', COUNT(*) FROM cart_items
UNION ALL SELECT 'wish_list_items', COUNT(*) FROM wish_list_items
UNION ALL SELECT 'product_likes', COUNT(*) FROM product_likes
UNION ALL SELECT 'global_ranking (product)', COUNT(*) FROM global_ranking WHERE item_type = 'product'
UNION ALL SELECT 'item_metrics (product)', COUNT(*) FROM item_metrics WHERE item_type = 'product'
UNION ALL SELECT 'stalker_gifts', COUNT(*) FROM stalker_gifts
UNION ALL SELECT 'order_items', COUNT(*) FROM order_items;
