# 🧠 MÓDULO FEED (Feed Combinado)

## 📋 Descripción

Este módulo implementa el feed combinado de productos y posters con ranking global. El feed NO se persiste por usuario, el orden es global y estable.

---

## 🎯 Principios de Diseño

1. **Feed NO persistido por usuario**: El orden es global, no personalizado
2. **Orden global estable**: El ranking se calcula basado en métricas agregadas
3. **Cursor-based pagination**: El cursor depende SOLO del ranking global
4. **Boost temporal**: El boost es en memoria, no modifica el ranking global
5. **Score interno**: El score nunca se expone al frontend

---

## 📐 Tablas Prisma

### `global_ranking`
- `item_id`: ID del item (producto o poster)
- `item_type`: Tipo ('product' | 'poster')
- `global_score`: Score global calculado
- `created_at`: Fecha de creación del item original
- `updated_at`: Última actualización del ranking

### `item_metrics`
- `item_id`: ID del item
- `item_type`: Tipo ('product' | 'poster')
- `wishlist_count`: Contador de wishlists
- `orders_count`: Contador de órdenes
- `likes_count`: Contador de likes
- `comments_count`: Contador de comentarios
- `updated_at`: Última actualización

---

## 🔄 Flujo de Funcionamiento

### 1. Inicialización de Métricas

Cuando se crea un producto o poster, se deben inicializar las métricas:

```typescript
import { FeedService } from './modules/feed/feed.service';

const feedService = new FeedService();

// Al crear un producto
await feedService.initializeItemMetrics(productId, 'product');

// Al crear un poster
await feedService.initializeItemMetrics(posterId, 'poster');
```

### 2. Actualización de Métricas (con Debouncing)

Cuando hay cambios en wishlist, orders, likes o comments, usar `updateItemMetricsDebounced()`:

```typescript
// Ejemplo: Cuando se da like a un poster (con debouncing de 15 segundos)
await feedService.updateItemMetricsDebounced(posterId, 'poster', {
  likesCount: poster.likesCount,
});

// Ejemplo: Cuando se crea una orden
await feedService.updateItemMetricsDebounced(productId, 'product', {
  ordersCount: newOrdersCount,
});
```

**⚠️ IMPORTANTE**: Usar `updateItemMetricsDebounced()` en lugar de `updateItemMetrics()` para evitar saturar la BD con muchas actualizaciones simultáneas. El debouncing agrupa múltiples actualizaciones y las ejecuta después de 15 segundos.

### 3. Cálculo de Ranking Global

El ranking se calcula automáticamente cuando se actualizan las métricas:

```
globalScore = (wishlistCount * 1) + (ordersCount * 5) + (likesCount * 2) + (commentsCount * 3)
```

Los pesos pueden ajustarse según necesidades.

### 4. Obtener Feed

```typescript
// Primera página
const feed = await feedService.getFeed(undefined, 20, userId);

// Página siguiente (con cursor)
const nextFeed = await feedService.getFeed(feed.nextCursor, 20, userId);
```

---

## 🔌 Integración con Otros Módulos

### Products Module

En `products.service.ts`, al crear un producto:

```typescript
import { FeedService } from '../feed/feed.service';

// Después de crear producto
const feedService = new FeedService();
await feedService.initializeItemMetrics(product.id, 'product');
```

### Posters Module

En `posters.service.ts`, al crear un poster:

```typescript
import { FeedService } from '../feed/feed.service';

// Después de crear poster
const feedService = new FeedService();
await feedService.initializeItemMetrics(poster.id, 'poster');
```

### Wishlists Module

En `wishlists.service.ts`, al agregar/eliminar de wishlist:

```typescript
import { FeedService } from '../feed/feed.service';

// Después de agregar a wishlist
const feedService = new FeedService();
const currentMetrics = await getItemMetrics(itemId, itemType);
await feedService.updateItemMetrics(itemId, itemType, {
  wishlistCount: currentMetrics.wishlistCount + 1,
});
```

### Orders Module

En `orders.service.ts`, al crear una orden:

```typescript
import { FeedService } from '../feed/feed.service';

// Para cada producto en la orden (agrupado por producto)
const feedService = new FeedService();
await feedService.updateItemMetricsDebounced(productId, 'product', {
  ordersCount: newOrdersCount, // Cantidad total vendida
});
```

**✅ Ya implementado**: La actualización de métricas se hace automáticamente al crear una orden.

### Posters Module (Likes/Comments)

En `posters.service.ts`, al dar like o comentar:

```typescript
import { FeedService } from '../feed/feed.service';

// Al dar like (con debouncing)
const feedService = new FeedService();
await feedService.updateItemMetricsDebounced(posterId, 'poster', {
  likesCount: poster.likesCount,
});

// Al comentar (con debouncing)
await feedService.updateItemMetricsDebounced(posterId, 'poster', {
  commentsCount: poster.commentsCount,
});
```

**✅ Ya implementado**: La actualización de métricas se hace automáticamente al dar like/comentar.

---

## 🚀 Inicialización de Datos Existentes

Para inicializar métricas y ranking para productos y posters existentes, crear un script:

```typescript
// scripts/initialize-feed-metrics.ts
import { prisma } from '../src/config/database';
import { FeedService } from '../src/modules/feed/feed.service';

async function initializeFeedMetrics() {
  const feedService = new FeedService();

  // Inicializar productos
  const products = await prisma.product.findMany({
    select: { id: true },
  });

  console.log(`Inicializando ${products.length} productos...`);
  for (const product of products) {
    await feedService.initializeItemMetrics(product.id, 'product');
    
    // Actualizar métricas reales
    const wishlistCount = await prisma.wishList.count({
      where: {
        items: {
          some: {
            productId: product.id,
          },
        },
      },
    });

    const ordersCount = await prisma.orderItem.count({
      where: {
        productId: product.id,
      },
    });

    await feedService.updateItemMetrics(product.id, 'product', {
      wishlistCount,
      ordersCount,
    });
  }

  // Inicializar posters
  const posters = await prisma.poster.findMany({
    select: { id: true, likesCount: true, commentsCount: true },
  });

  console.log(`Inicializando ${posters.length} posters...`);
  for (const poster of posters) {
    await feedService.initializeItemMetrics(poster.id, 'poster');
    
    await feedService.updateItemMetrics(poster.id, 'poster', {
      likesCount: poster.likesCount,
      commentsCount: poster.commentsCount,
    });
  }

  console.log('✅ Métricas inicializadas');
}

initializeFeedMetrics();
```

---

## 📝 Endpoints

### GET /api/v1/feed

Obtener feed combinado con cursor-based pagination.

**Query Params**:
- `cursor` (opcional): JSON stringificado del cursor para paginación
- `limit` (opcional): Número de items (default: 20, max: 50)

**Ejemplo**:
```bash
# Primera página
GET /api/v1/feed?limit=20

# Página siguiente
GET /api/v1/feed?cursor={"lastGlobalScore":123.45,"lastCreatedAt":"2025-01-22T10:00:00Z","lastItemId":"item123"}&limit=20
```

**Respuesta**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "product123",
        "type": "product",
        "title": "Producto ejemplo",
        "imageUrl": "https://...",
        "price": 29900,
        "category": {
          "id": "cat123",
          "name": "Categoría",
          "handle": "categoria"
        },
        "createdAt": "2025-01-22T10:00:00Z"
      },
      {
        "id": "poster456",
        "type": "poster",
        "imageUrl": "https://...",
        "likesCount": 10,
        "commentsCount": 5,
        "author": {
          "id": "user123",
          "email": "user@example.com",
          "firstName": "Juan",
          "lastName": "Pérez",
          "avatar": "https://..."
        },
        "createdAt": "2025-01-22T09:00:00Z"
      }
    ],
    "nextCursor": {
      "lastGlobalScore": 123.45,
      "lastCreatedAt": "2025-01-22T09:00:00Z",
      "lastItemId": "poster456"
    }
  }
}
```

---

## 🔧 Boost Temporal

El boost es temporal y en memoria. Se aplica solo para ordenamiento, no modifica el ranking global.

```typescript
// Aplicar boost a un item
feedService.applyBoost(itemId, 'product', 1.5); // 50% más visible

// Remover boost
feedService.removeBoost(itemId, 'product');
```

**Nota**: El boost se aplica solo si hay `userId` (onboarding). Por ahora, el boost siempre es 1.0 (sin boost).

---

## 📊 Jobs/Workers (Futuro)

Para actualizar el ranking periódicamente, crear un worker:

```typescript
// src/modules/feed/feed-worker.ts
import { FeedService } from './feed.service';
import { prisma } from '../../config/database';

export async function updateFeedRankings() {
  const feedService = new FeedService();
  
  // Obtener todos los items con métricas
  const metrics = await prisma.itemMetric.findMany();
  
  for (const metric of metrics) {
    await feedService.updateItemMetrics(
      metric.itemId,
      metric.itemType as 'product' | 'poster',
      {
        wishlistCount: metric.wishlistCount,
        ordersCount: metric.ordersCount,
        likesCount: metric.likesCount,
        commentsCount: metric.commentsCount,
      }
    );
  }
}
```

---

## ⚠️ Notas Importantes

1. **El ranking se calcula automáticamente** cuando se actualizan las métricas
2. **El boost es temporal** y no persiste
3. **El cursor es estable** y no cambia con el boost
4. **Los pesos del ranking** pueden ajustarse según necesidades
5. **La inicialización de métricas** debe hacerse para items existentes

---

**Última actualización**: 2025-01-22  
**Estado**: Implementado ✅

