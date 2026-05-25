# Catálogo por favoritos Dropi

Changelog técnico de la sincronización basada **solo en favoritos** Dropi (`favorite: true` en la API).

## Fuente de verdad

Tras cada corrida exitosa de **Sincronizar catálogo** (`SYNC_STOCK`):

1. `dropi_raw_products` contiene únicamente filas del `syncRunId` actual (se purgan corridas anteriores).
2. `catalogDropiIds` = `distinct(dropiId)` de ese raw.
3. `dropi_products` solo incluye esos IDs (purge de los demás).
4. `products` (Tanku) se sincroniza solo desde ese set.

## Campos nuevos en `products`

| Campo | Descripción |
|-------|-------------|
| `dropi_id` | ID Dropi único |
| `in_dropi_catalog` | `true` si está en favoritos del último sync |
| `removed_from_catalog_at` | Fecha en que salió de favoritos |

## Retiro al quitar favorito

| Situación | `dropi_products` | `products` Tanku |
|-----------|------------------|------------------|
| Sin pedidos (`order_items`) | Eliminado | Fila eliminada (+ wishlist items, likes, etc.) |
| Con pedidos | Eliminado | `active=false`, `in_dropi_catalog=false`, se conserva fila para historial de órdenes y soporte |

No aparece en feed ni ranking. El ERP muestra badge **Solo historial (pedidos)**.

## Activación manual (ERP)

No se puede activar (`active=true`) si `in_dropi_catalog=false` o no existe en `dropi_products`. Mensaje: volver a marcar favorito en Dropi y ejecutar **Sincronizar catálogo**.

## Workers en Tanku Admin

**Operación:**

- **Sincronizar catálogo** — pipeline completo (RAW → normalizar/retiro → Tanku → stock/ranking).
- **Enriquecer** — solo `dropi_products` del catálogo actual (último raw).

**Debug** (rutas existentes, no listadas en `/workers`): RAW, Normalizar, Sincronizar backend.

## Cómo probar

1. Marca producto A como favorito en Dropi → **Sincronizar catálogo** → debe existir en `products` con `in_dropi_catalog=true`.
2. Quita favorito A → sync de nuevo:
   - Sin pedidos: A no está en `products`.
   - Con pedido previo: A sigue en `products`, inactivo, badge historial; órdenes admin intactas.
3. Re-favorito A → sync → vuelve `in_dropi_catalog=true`.

## Scripts

- Migración: `prisma/migrations/20260523120000_product_dropi_catalog_fields/`
- Backfill `dropi_id` desde handle: `tanku-backend/scripts/backfill-product-dropi-id.sql`
