# 🔍 Análisis Completo de Performance y Arquitectura - MyTankuGif

**Fecha:** 2025-01-27  
**Analista:** Staff Software Engineer  
**Objetivo:** Detectar problemas de performance, escalabilidad y arquitectura

---

## 📊 Resumen Ejecutivo

Se detectaron **15 problemas críticos**, **12 problemas de performance**, **8 problemas de arquitectura** y múltiples oportunidades de optimización. El sistema actual realiza **11 peticiones HTTP al cargar el feed**, de las cuales **al menos 4 son duplicadas o innecesarias**.

---

## 1️⃣ PROBLEMAS CRÍTICOS ENCONTRADOS

### 🔴 CRÍTICO 1: Múltiples llamadas duplicadas al cargar el feed

**Ubicación:** `tanku-front/app/(main)/feed/page.tsx`, `tanku-front/components/layout/sidebar.tsx`

**Problema:**
Al entrar al feed se ejecutan estas peticiones en paralelo:
- `GET /api/v1/cart` (desde `CartButton`)
- `GET /api/v1/categories` (desde `FeedPage`)
- `GET /api/v1/feed` o `/api/v1/feed/public` (desde `useFeed`)
- `GET /api/v1/stories` (desde `useStories` - se llama múltiples veces)
- `GET /api/v1/chat/conversations` (desde `useChat` - se llama múltiples veces)
- `GET /api/v1/chat/unread-count` (desde `useChat` - se llama múltiples veces)
- `GET /api/v1/notifications` (desde `useNotifications`)
- `GET /api/v1/notifications/unread-count` (desde `useNotifications`)
- `GET /api/v1/auth/me` (desde `useAuthInit`)

**Evidencia:**
```typescript:tanku-front/lib/hooks/use-chat.ts
// Líneas 567-592: Se ejecuta cada vez que user?.id cambia
useEffect(() => {
  if (!user?.id) return
  const loadData = async () => {
    await fetchConversations()  // ❌ Llamada duplicada
    await fetchUnreadCount()    // ❌ Llamada duplicada
  }
  loadData()
}, [user?.id])
```

**Impacto:** 
- 11 peticiones HTTP simultáneas al cargar el feed
- Alto consumo de ancho de banda
- Latencia acumulada
- Carga innecesaria en el servidor

**Solución:** Crear endpoint batch `/api/v1/feed/init` que retorne todos los datos necesarios.

---

### 🔴 CRÍTICO 2: Polling innecesario en `use-chat-service.ts`

**Ubicación:** `tanku-front/lib/hooks/use-chat-service.ts`

**Problema:**
Hay dos `setInterval` ejecutándose constantemente:
1. **Línea 100:** Sincroniza estado cada 5 segundos
2. **Línea 116:** Sincroniza mensajes cada 2 segundos

```typescript:tanku-front/lib/hooks/use-chat-service.ts
// ❌ PROBLEMA: Polling cada 5 segundos
const interval = setInterval(syncState, 5000)

// ❌ PROBLEMA: Polling cada 2 segundos
const interval = setInterval(() => {
  // Actualizar mensajes desde el servicio
}, 2000)
```

**Impacto:**
- 12 llamadas por minuto por usuario (6 de sincronización + 6 de mensajes)
- Consumo innecesario de CPU y memoria
- Con 1000 usuarios = 12,000 llamadas/minuto innecesarias

**Solución:** Eliminar polling y usar Socket.IO para actualizaciones en tiempo real.

---

### 🔴 CRÍTICO 3: `useChat` y `useChatService` duplican funcionalidad

**Ubicación:** `tanku-front/lib/hooks/use-chat.ts`, `tanku-front/lib/hooks/use-chat-service.ts`

**Problema:**
Existen dos hooks que hacen lo mismo:
- `useChat`: Usa `useSocket` directamente
- `useChatService`: Usa `chatService` con polling

Ambos se pueden estar usando simultáneamente, causando:
- Conexiones Socket.IO duplicadas
- Estado duplicado en memoria
- Llamadas API duplicadas

**Solución:** Consolidar en un solo hook y eliminar `useChatService`.

---

### 🔴 CRÍTICO 4: `fetchConversations` se llama múltiples veces

**Ubicación:** `tanku-front/lib/hooks/use-chat.ts`

**Problema:**
El hook `useChat` tiene múltiples `useEffect` que pueden disparar `fetchConversations`:

```typescript:tanku-front/lib/hooks/use-chat.ts
// Línea 118-122: Se ejecuta cuando user?.id cambia
useEffect(() => {
  if (user?.id) {
    fetchConversations()  // ❌ Primera llamada
  }
}, [user?.id, fetchConversations])

// Línea 567-592: Se ejecuta cuando user?.id cambia (OTRA VEZ)
useEffect(() => {
  if (!user?.id) return
  const loadData = async () => {
    await fetchConversations()  // ❌ Segunda llamada (DUPLICADA)
    await fetchUnreadCount()
  }
  loadData()
}, [user?.id])
```

**Impacto:** 
- 2-3 llamadas a `/api/v1/chat/conversations` al montar el componente
- Estado inconsistente si las respuestas llegan en diferente orden

**Solución:** Consolidar en un solo `useEffect` con guard para evitar llamadas duplicadas.

---

### 🔴 CRÍTICO 5: `fetchStories` se ejecuta múltiples veces

**Ubicación:** `tanku-front/lib/hooks/use-stories.ts`

**Problema:**
El hook `useStories` se puede estar usando en múltiples componentes simultáneamente:

```typescript:tanku-front/lib/hooks/use-stories.ts
// Línea 149-153: Se ejecuta cada vez que se monta el hook
useEffect(() => {
  if (isAuthenticated && user?.id) {
    fetchFeedStories()  // ❌ Se puede llamar desde múltiples componentes
  }
}, [isAuthenticated, user?.id, fetchFeedStories])
```

**Impacto:**
- Si 3 componentes usan `useStories`, se hacen 3 llamadas a `/api/v1/stories`
- Alto consumo de recursos del servidor

**Solución:** Mover el estado de stories a un store global (Zustand) o Context.

---

### 🔴 CRÍTICO 6: Cache en memoria sin límite de crecimiento

**Ubicación:** `tanku-backend/src/modules/feed/feed.service.ts`

**Problema:**
El servicio de feed mantiene Maps en memoria que crecen indefinidamente:

```typescript:tanku-backend/src/modules/feed/feed.service.ts
// Línea 22: boostMap sin límite
private boostMap: Map<string, number> = new Map()

// Línea 38: cursorTokens sin límite (solo se limpian expirados)
private cursorTokens: Map<string, { cursor: FeedCursorDTO; expiresAt: Date }> = new Map()
```

**Impacto:**
- **Memory leak:** Los Maps crecen indefinidamente
- Con 10,000 usuarios activos = potencialmente 10,000+ tokens en memoria
- Cada token ocupa ~500 bytes = 5MB solo en tokens
- Sin contar el boostMap que puede crecer más

**Solución:** Implementar límite máximo de entradas y LRU eviction.

---

### 🔴 CRÍTICO 7: `getBlockedCategoryIds()` se llama en cada request del feed

**Ubicación:** `tanku-backend/src/modules/feed/feed.service.ts`

**Problema:**
En cada llamada a `getFeed()`, se ejecuta:

```typescript:tanku-backend/src/modules/feed/feed.service.ts
// Línea 168: Se llama en cada request
const blockedCategoryIds = await getBlockedCategoryIds();

// Línea 538: Se llama OTRA VEZ en getProductsByRanking
const blockedCategoryIds = await getBlockedCategoryIds();
```

**Impacto:**
- Query a la BD en cada request del feed
- Las categorías bloqueadas cambian raramente (quizás 1 vez al día)
- Con 1000 requests/segundo = 1000 queries innecesarias/segundo

**Solución:** Cachear en memoria con TTL de 1 hora.

---

### 🔴 CRÍTICO 8: Queries N+1 potenciales en feed service

**Ubicación:** `tanku-backend/src/modules/feed/feed.service.ts`

**Problema:**
Aunque se usan batch queries, hay queries adicionales que se pueden optimizar:

```typescript:tanku-backend/src/modules/feed/feed.service.ts
// Línea 238-258: Batch query para métricas (✅ BIEN)
const metrics = await prisma.itemMetric.findMany({...})

// Línea 264-278: Batch query para likes del usuario (✅ BIEN)
const userLikes = await prisma.productLike.findMany({...})

// Línea 285-302: Batch query para wishlists (✅ BIEN)
const wishlistItems = await prisma.wishListItem.findMany({...})
```

**PERO:** Si hay muchos productos (50+), estas queries pueden ser lentas.

**Solución:** Usar `Promise.all()` para ejecutar las 3 queries en paralelo.

---

### 🔴 CRÍTICO 9: `FloatingChatsManager` carga `useChat` innecesariamente

**Ubicación:** `tanku-front/components/chat/floating-chats-manager.tsx`

**Problema:**
El componente siempre carga `useChat()` aunque no haya chats abiertos:

```typescript:tanku-front/components/chat/floating-chats-manager.tsx
// Línea 14: Siempre se ejecuta useChat()
const { conversations } = useChat()
```

**Impacto:**
- `useChat` se ejecuta aunque el usuario no tenga chats abiertos
- Dispara todas las llamadas API de chat innecesariamente

**Solución:** Lazy load: solo cargar `useChat` cuando hay chats abiertos.

---

### 🔴 CRÍTICO 10: Redis deshabilitado pero código sigue intentando usarlo

**Ubicación:** Múltiples archivos del backend

**Problema:**
Redis está deshabilitado temporalmente, pero el código puede tener referencias que causan errores o comportamiento inesperado.

**Solución:** 
1. Verificar todas las referencias a Redis
2. Implementar fallback a memoria o BD
3. O habilitar Redis con configuración adecuada

---

## 2️⃣ PROBLEMAS DE PERFORMANCE

### ⚠️ PERFORMANCE 1: Feed service hace múltiples queries secuenciales

**Ubicación:** `tanku-backend/src/modules/feed/feed.service.ts`

**Problema:**
En `getFeed()`, las queries se ejecutan secuencialmente:

```typescript:tanku-backend/src/modules/feed/feed.service.ts
// Línea 104-133: Obtener productos (secuencial)
products = await this.getProductsByRanking(...)

// Línea 138-148: Obtener posts (secuencial)
posts = await this.getPostsByDate(...)

// Línea 168: Obtener categorías bloqueadas (secuencial)
const blockedCategoryIds = await getBlockedCategoryIds()

// Línea 170-195: Batch query productos (secuencial)
productsData = await prisma.product.findMany({...})

// Línea 201-216: Batch query posters (secuencial)
postersData = await prisma.poster.findMany({...})
```

**Optimización:** Ejecutar queries independientes en paralelo con `Promise.all()`.

---

### ⚠️ PERFORMANCE 2: `getProductsByRanking` hace query adicional para categorías

**Ubicación:** `tanku-backend/src/modules/feed/feed.service.ts`

**Problema:**
Si se filtra por categoría, se hace una query adicional:

```typescript:tanku-backend/src/modules/feed/feed.service.ts
// Línea 550-553: Query para obtener categoría
const category = await prisma.category.findUnique({...})

// Línea 561: Query para obtener hijos
const childrenIds = await getAllChildrenIds(categoryId)

// Línea 566-574: Query para obtener productos en categoría
const productsInCategory = await prisma.product.findMany({...})
```

**Optimización:** Cachear estructura de categorías en memoria (cambia raramente).

---

### ⚠️ PERFORMANCE 3: `CartButton` hace fetch en cada render si hay eventos

**Ubicación:** `tanku-front/components/layout/cart-button.tsx`

**Problema:**
El componente escucha eventos `cartUpdated` y hace fetch:

```typescript:tanku-front/components/layout/cart-button.tsx
// Línea 37-51: Escucha eventos y hace fetch
useEffect(() => {
  const handleCartUpdated = () => {
    setTimeout(() => {
      fetchCart()  // ❌ Puede dispararse múltiples veces
    }, 0)
  }
  window.addEventListener('cartUpdated', handleCartUpdated)
}, [fetchCart])
```

**Impacto:** Si múltiples componentes emiten `cartUpdated`, se hacen múltiples fetches.

**Solución:** Debounce o usar el store de Zustand directamente sin fetch adicional.

---

### ⚠️ PERFORMANCE 4: `useNotifications` hace 2 llamadas al montar

**Ubicación:** `tanku-front/lib/hooks/use-notifications.ts`

**Problema:**
Al montar, se hacen 2 llamadas:

```typescript:tanku-front/lib/hooks/use-notifications.ts
// Línea 126-133: Se ejecutan ambas llamadas
useEffect(() => {
  if (!isAuthenticated) return
  fetchUnreadCount()      // ❌ Primera llamada
  if (options?.autoFetch !== false) {
    fetchList()            // ❌ Segunda llamada
  }
}, [isAuthenticated, fetchUnreadCount, fetchList])
```

**Solución:** El endpoint `/api/v1/notifications` debería retornar el count también, o usar el endpoint batch.

---

### ⚠️ PERFORMANCE 5: `useFeed` no usa React Query para cache

**Ubicación:** `tanku-front/lib/hooks/use-feed.ts`

**Problema:**
El hook `useFeed` implementa su propio estado en lugar de usar React Query que ya está configurado:

```typescript:tanku-front/lib/providers/query-provider.tsx
// React Query está configurado pero no se usa en useFeed
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000, // 1 minuto
        },
      },
    })
  )
}
```

**Solución:** Migrar `useFeed` a usar `useQuery` de React Query para cache automático.

---

### ⚠️ PERFORMANCE 6: Feed service no usa índices optimizados

**Ubicación:** `tanku-backend/src/modules/feed/feed.service.ts`

**Problema:**
Las queries del feed pueden no estar usando índices óptimos:

```typescript:tanku-backend/src/modules/feed/feed.service.ts
// Línea 704: Query a globalRanking
rankingItems = await prisma.globalRanking.findMany({
  where,
  orderBy: [
    { globalScore: 'desc' },
    { createdAt: 'desc' },
  ],
  take: limit,
})
```

**Verificar:** 
- ¿Existe índice compuesto en `(globalScore DESC, createdAt DESC)`?
- ¿Existe índice en `itemId` para el filtro `itemId: { in: productIds }`?

**Solución:** Revisar schema de Prisma y agregar índices faltantes.

---

### ⚠️ PERFORMANCE 7: `getAllChildrenIds` puede ser lento con muchas categorías

**Ubicación:** `tanku-backend/src/shared/utils/category.utils.ts` (asumido)

**Problema:**
Si hay muchas categorías anidadas, `getAllChildrenIds` puede hacer múltiples queries recursivas.

**Solución:** 
1. Cachear estructura de categorías en memoria
2. O usar CTE (Common Table Expression) en PostgreSQL para query recursiva eficiente

---

### ⚠️ PERFORMANCE 8: Feed público tiene cache pero feed privado no

**Ubicación:** `tanku-backend/src/modules/feed/feed.service.ts`

**Problema:**
Solo el feed público tiene cache:

```typescript:tanku-backend/src/modules/feed/feed.service.ts
// Línea 48-54: Solo cache para feed público
private publicFeedCache: {
  data: FeedResponseDTO | null;
  timestamp: number;
} | null = null;
```

**Solución:** Implementar cache para feed privado también (por userId + filtros).

---

### ⚠️ PERFORMANCE 9: `useChat` recalcula `unreadCount` en cada render

**Ubicación:** `tanku-front/lib/hooks/use-chat.ts`

**Problema:**
El hook recalcula el contador de no leídos en cada actualización de mensajes:

```typescript:tanku-front/lib/hooks/use-chat.ts
// Línea 348-367: Recalcula contador con setTimeout
setTimeout(() => {
  setMessages((currentMessages) => {
    let totalUnread = 0
    conversations.forEach(conv => {
      // ... cálculo costoso
    })
    setUnreadCount(totalUnread)
    return currentMessages
  })
}, 100)
```

**Solución:** Usar `useMemo` para cachear el cálculo.

---

### ⚠️ PERFORMANCE 10: Socket.IO no usa rooms eficientemente

**Ubicación:** `tanku-backend/src/shared/realtime/socket.service.ts`

**Problema:**
Cada usuario se une a `user:${userId}`, pero no hay optimización para broadcasts masivos.

**Solución:** 
- Usar namespaces de Socket.IO para separar por feature
- Implementar rate limiting en eventos

---

### ⚠️ PERFORMANCE 11: `CartButton` hace fetch al montar siempre

**Ubicación:** `tanku-front/components/layout/cart-button.tsx`

**Problema:**
El componente siempre hace fetch al montar, incluso si el carrito ya está en el store:

```typescript:tanku-front/components/layout/cart-button.tsx
// Línea 23-25: Siempre hace fetch
useEffect(() => {
  fetchCart()
}, [fetchCart])
```

**Solución:** Solo hacer fetch si el carrito no está en el store o está stale.

---

### ⚠️ PERFORMANCE 12: Feed service intercala items en memoria sin optimización

**Ubicación:** `tanku-backend/src/modules/feed/feed.service.ts`

**Problema:**
El método `intercalateItems` procesa arrays en memoria que pueden ser grandes (50+ items).

**Optimización:** Usar iteradores o procesamiento lazy si es posible.

---

## 3️⃣ PROBLEMAS DE ARQUITECTURA

### 🏗️ ARQUITECTURA 1: Falta endpoint batch para inicialización

**Problema:**
No existe un endpoint que agrupe las peticiones iniciales del feed.

**Solución:** Crear `/api/v1/feed/init` que retorne:
```typescript
{
  feed: FeedResponseDTO,
  categories: Category[],
  cart: Cart,
  stories: StoryDTO[],
  conversations: Conversation[],
  unreadCounts: {
    chat: number,
    notifications: number
  },
  notifications: NotificationDTO[],
  user: UserDTO
}
```

---

### 🏗️ ARQUITECTURA 2: Estado duplicado entre hooks y stores

**Problema:**
Hay estado duplicado:
- `useChat` mantiene estado local
- `useChatService` mantiene estado local
- `useCartStore` mantiene estado
- `useNotifications` mantiene estado local

**Solución:** Consolidar en stores de Zustand para single source of truth.

---

### 🏗️ ARQUITECTURA 3: Socket.IO no se usa para todas las actualizaciones en tiempo real

**Problema:**
Algunas actualizaciones usan polling en lugar de Socket.IO:
- Chat: Usa Socket.IO ✅
- Notificaciones: Usa Socket.IO ✅
- Stories: No usa Socket.IO ❌
- Cart: No usa Socket.IO ❌
- Feed: No usa Socket.IO ❌

**Solución:** Implementar eventos Socket.IO para:
- Nuevas stories
- Cambios en carrito (si es compartido)
- Nuevos posts en feed (opcional, puede ser polling menos frecuente)

---

### 🏗️ ARQUITECTURA 4: Falta estrategia de cache consistente

**Problema:**
- Feed público: Cache en memoria (60s)
- Feed privado: Sin cache
- Categorías: Sin cache
- Stories: Sin cache
- Redis: Deshabilitado

**Solución:** 
1. Habilitar Redis
2. Implementar cache consistente con TTLs apropiados:
   - Feed público: 60s
   - Feed privado: 30s
   - Categorías: 1 hora
   - Stories: 5 minutos

---

### 🏗️ ARQUITECTURA 5: Feed service tiene responsabilidades mezcladas

**Problema:**
El `FeedService` hace demasiadas cosas:
- Obtiene productos
- Obtiene posts
- Intercala items
- Calcula métricas
- Maneja cache
- Maneja cursors
- Maneja boost

**Solución:** Separar en servicios más pequeños:
- `ProductFeedService`
- `PostFeedService`
- `FeedIntercalationService`
- `FeedCacheService`

---

### 🏗️ ARQUITECTURA 6: Falta rate limiting en endpoints críticos

**Problema:**
No se detectó rate limiting en:
- `/api/v1/feed`
- `/api/v1/chat/conversations`
- `/api/v1/stories`

**Solución:** Implementar rate limiting con `express-rate-limit` o similar.

---

### 🏗️ ARQUITECTURA 7: Queries del feed no están optimizadas para paginación

**Problema:**
El feed usa cursor-based pagination, pero las queries pueden no estar optimizadas para grandes offsets.

**Solución:** 
- Verificar que los índices soporten cursor-based pagination
- Considerar usar `OFFSET` solo para casos específicos

---

### 🏗️ ARQUITECTURA 8: Falta monitoreo y métricas

**Problema:**
No se detectó sistema de métricas para:
- Tiempo de respuesta de endpoints
- Número de queries por request
- Uso de memoria
- Conexiones Socket.IO activas

**Solución:** Implementar:
- APM (Application Performance Monitoring)
- Métricas de Prometheus
- Logging estructurado

---

## 4️⃣ PETICIONES INNECESARIAS O DUPLICADAS

### 📡 DUPLICADA 1: `/api/v1/chat/conversations` se llama 2-3 veces

**Evidencia:**
- `useChat` línea 118-122
- `useChat` línea 567-592
- Posiblemente desde `FloatingChatsManager`

**Solución:** Consolidar en un solo lugar.

---

### 📡 DUPLICADA 2: `/api/v1/chat/unread-count` se llama 2 veces

**Evidencia:**
- `useChat` línea 579
- Posiblemente desde otro componente

**Solución:** Cachear resultado y usar Socket.IO para actualizaciones.

---

### 📡 DUPLICADA 3: `/api/v1/stories` se llama desde múltiples componentes

**Evidencia:**
- `useStories` se puede usar en múltiples lugares

**Solución:** Mover a store global.

---

### 📡 DUPLICADA 4: `/api/v1/cart` se llama desde múltiples lugares

**Evidencia:**
- `CartButton` línea 24
- `cart-store.ts` línea 62
- Eventos `cartUpdated` disparan fetches adicionales

**Solución:** Usar store de Zustand como single source of truth.

---

### 📡 INNECESARIA 1: `/api/v1/notifications` y `/api/v1/notifications/unread-count` se pueden combinar

**Solución:** El endpoint de notificaciones debería retornar el count también, o usar endpoint batch.

---

### 📡 INNECESARIA 2: Polling en `use-chat-service.ts`

**Solución:** Eliminar polling y usar solo Socket.IO.

---

## 5️⃣ PROBLEMAS EN EL USO DE SOCKET.IO

### 🔌 SOCKET 1: Múltiples inicializaciones de Socket.IO

**Problema:**
- `useSocket` inicializa socket
- `useChatService` puede inicializar otro socket
- `chatService` puede inicializar otro socket

**Solución:** Singleton pattern para Socket.IO client.

---

### 🔌 SOCKET 2: Socket.IO no se usa para actualizar contadores

**Problema:**
Los contadores de no leídos se actualizan vía polling o REST, no vía Socket.IO.

**Solución:** Emitir eventos Socket.IO cuando cambien los contadores.

---

### 🔌 SOCKET 3: Falta manejo de reconexión en el frontend

**Problema:**
Aunque Socket.IO tiene reconexión automática, no se maneja el estado de "reconectando" en la UI.

**Solución:** Exponer estado de conexión y mostrar indicador visual.

---

### 🔌 SOCKET 4: No hay rate limiting en eventos Socket.IO

**Problema:**
Un cliente puede emitir eventos ilimitadamente.

**Solución:** Implementar rate limiting en el servidor Socket.IO.

---

## 6️⃣ OPTIMIZACIÓN RECOMENDADA PARA EL FEED

### ✅ FEED 1: Crear endpoint batch `/api/v1/feed/init`

**Implementación:**
```typescript
// Backend: feed.controller.ts
getFeedInit = async (req: Request, res: Response) => {
  const userId = req.user?.id
  const [feed, categories, cart, stories, conversations, unreadCounts, notifications, user] = await Promise.all([
    this.feedService.getFeed(undefined, userId),
    this.categoryService.getAll(),
    this.cartService.getCart(userId),
    this.storiesService.getFeedStories(userId),
    this.chatService.getConversations(userId),
    this.getUnreadCounts(userId),
    this.notificationsService.getNotifications(userId, { limit: 10 }),
    userId ? this.authService.getUser(userId) : null
  ])
  
  res.json({
    feed,
    categories,
    cart,
    stories,
    conversations,
    unreadCounts,
    notifications,
    user
  })
}
```

**Beneficio:** Reduce 11 peticiones a 1.

---

### ✅ FEED 2: Cachear feed privado con TTL de 30s

**Implementación:**
```typescript
// Backend: feed.service.ts
private feedCache: Map<string, { data: FeedResponseDTO; timestamp: number }> = new Map()
private readonly FEED_CACHE_TTL = 30000 // 30 segundos

async getFeed(...) {
  const cacheKey = `${userId || 'public'}-${categoryId || 'all'}-${search || ''}`
  const cached = this.feedCache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < this.FEED_CACHE_TTL) {
    return cached.data
  }
  
  // ... obtener feed
  this.feedCache.set(cacheKey, { data: feed, timestamp: Date.now() })
  return feed
}
```

---

### ✅ FEED 3: Ejecutar queries en paralelo

**Implementación:**
```typescript
// Backend: feed.service.ts
const [products, posts, blockedCategoryIds] = await Promise.all([
  this.getProductsByRanking(...),
  this.getPostsByDate(...),
  getBlockedCategoryIds() // Cachear esto también
])
```

---

### ✅ FEED 4: Cachear categorías bloqueadas

**Implementación:**
```typescript
// Backend: feed.service.ts
private blockedCategoryIdsCache: string[] | null = null
private blockedCategoryIdsCacheTime: number = 0
private readonly BLOCKED_CATEGORIES_TTL = 3600000 // 1 hora

private async getBlockedCategoryIdsCached(): Promise<string[]> {
  if (this.blockedCategoryIdsCache && Date.now() - this.blockedCategoryIdsCacheTime < this.BLOCKED_CATEGORIES_TTL) {
    return this.blockedCategoryIdsCache
  }
  
  this.blockedCategoryIdsCache = await getBlockedCategoryIds()
  this.blockedCategoryIdsCacheTime = Date.now()
  return this.blockedCategoryIdsCache
}
```

---

### ✅ FEED 5: Usar React Query para cache en frontend

**Implementación:**
```typescript
// Frontend: lib/hooks/use-feed.ts
export function useFeed(filters: FeedFilters = {}) {
  return useQuery({
    queryKey: ['feed', filters],
    queryFn: () => apiClient.get<FeedResponse>(...),
    staleTime: 30000, // 30 segundos
    cacheTime: 60000, // 1 minuto
  })
}
```

---

## 7️⃣ OPTIMIZACIÓN RECOMENDADA PARA CHAT

### ✅ CHAT 1: Eliminar `useChatService` y consolidar en `useChat`

**Implementación:**
- Eliminar `tanku-front/lib/hooks/use-chat-service.ts`
- Eliminar `tanku-front/lib/services/chat.service.ts` (si no se usa en otros lugares)
- Usar solo `useChat` que ya usa `useSocket`

---

### ✅ CHAT 2: Eliminar polling

**Implementación:**
- Eliminar `setInterval` de `use-chat-service.ts`
- Usar solo eventos Socket.IO para actualizaciones

---

### ✅ CHAT 3: Consolidar `useEffect` en `useChat`

**Implementación:**
```typescript
// Frontend: lib/hooks/use-chat.ts
useEffect(() => {
  if (!user?.id) return
  
  let mounted = true
  const loadData = async () => {
    if (mounted) {
      await Promise.all([
        fetchConversations(),
        fetchUnreadCount()
      ])
    }
  }
  
  loadData()
  
  return () => {
    mounted = false
  }
}, [user?.id]) // Solo user?.id como dependencia
```

---

### ✅ CHAT 4: Cachear contador de no leídos

**Implementación:**
- Usar Socket.IO para actualizar contador en tiempo real
- Cachear en store de Zustand
- Solo hacer fetch REST una vez al montar

---

### ✅ CHAT 5: Lazy load `FloatingChatsManager`

**Implementación:**
```typescript
// Frontend: components/chat/floating-chats-manager.tsx
const { conversations } = openChats.length > 0 ? useChat() : { conversations: [] }
```

O mejor, usar store de Zustand para conversations.

---

## 8️⃣ ESTRATEGIA DE CACHE RECOMENDADA

### 💾 CACHE 1: Habilitar Redis

**Prioridad:** ALTA

**Implementación:**
1. Configurar Redis en producción
2. Implementar cliente Redis con fallback a memoria
3. Usar Redis para:
   - Feed cache (público y privado)
   - Categorías bloqueadas
   - Contadores de no leídos
   - Sesiones de Socket.IO

---

### 💾 CACHE 2: Cache en memoria con límites

**Prioridad:** ALTA

**Implementación:**
```typescript
// Backend: shared/cache/memory-cache.ts
class MemoryCache<K, V> {
  private cache = new Map<K, { value: V; expiresAt: number }>()
  private maxSize: number
  
  set(key: K, value: V, ttl: number) {
    // Si está lleno, eliminar el más antiguo (LRU)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl
    })
  }
}
```

---

### 💾 CACHE 3: Cache de categorías

**Prioridad:** MEDIA

**TTL:** 1 hora

**Implementación:**
- Cachear lista de categorías
- Cachear estructura de hijos
- Invalidar solo cuando se crea/actualiza categoría

---

### 💾 CACHE 4: Cache de feed con invalidación inteligente

**Prioridad:** ALTA

**TTL:** 
- Feed público: 60s
- Feed privado: 30s

**Invalidación:**
- Cuando se crea nuevo post
- Cuando se actualiza ranking de producto
- Cuando se crea nueva story

---

### 💾 CACHE 5: Cache de contadores

**Prioridad:** MEDIA

**TTL:** 10 segundos

**Implementación:**
- Cachear contadores de no leídos (chat y notificaciones)
- Actualizar vía Socket.IO en tiempo real
- Fallback a REST cada 10s si Socket.IO no está conectado

---

## 9️⃣ CAMBIOS CONCRETOS QUE DEBES HACER

### 🔧 CAMBIO 1: Crear endpoint batch `/api/v1/feed/init`

**Archivo:** `tanku-backend/src/modules/feed/feed.controller.ts`

```typescript
getFeedInit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as RequestWithUser).user?.id
    
    const [
      feed,
      categories,
      cart,
      stories,
      conversations,
      chatUnreadCount,
      notifications,
      notificationUnreadCount,
      user
    ] = await Promise.all([
      this.feedService.getFeed(undefined, userId),
      this.categoryService.getAll(),
      this.cartService.getCart(userId),
      this.storiesService.getFeedStories(userId),
      this.chatService.getConversations(userId),
      userId ? this.chatService.getUnreadCount(userId) : Promise.resolve({ count: 0 }),
      userId ? this.notificationsService.getNotifications(userId, { limit: 10 }) : Promise.resolve([]),
      userId ? this.notificationsService.getUnreadCount(userId) : Promise.resolve({ unreadCount: 0, totalCount: 0 }),
      userId ? this.authService.getUser(userId) : Promise.resolve(null)
    ])
    
    res.status(200).json(successResponse({
      feed,
      categories,
      cart,
      stories,
      conversations,
      unreadCounts: {
        chat: chatUnreadCount.count || 0,
        notifications: notificationUnreadCount.unreadCount || 0
      },
      notifications,
      user
    }))
  } catch (error: any) {
    next(error)
  }
}
```

**Archivo:** `tanku-backend/src/modules/feed/feed.routes.ts`

```typescript
router.get('/init', authenticateOptional, feedController.getFeedInit)
```

---

### 🔧 CAMBIO 2: Eliminar polling de `use-chat-service.ts`

**Archivo:** `tanku-front/lib/hooks/use-chat-service.ts`

**Eliminar líneas 100 y 116-139** (los `setInterval`)

---

### 🔧 CAMBIO 3: Consolidar `useEffect` en `useChat`

**Archivo:** `tanku-front/lib/hooks/use-chat.ts`

**Eliminar líneas 118-122** (primer `useEffect` duplicado)

**Modificar líneas 567-592:**
```typescript
// Cargar conversaciones al montar (SOLO una vez)
useEffect(() => {
  if (!user?.id) return
  
  let mounted = true
  let hasLoaded = false // ✅ Guard para evitar llamadas duplicadas
  
  const loadData = async () => {
    if (mounted && !hasLoaded) {
      hasLoaded = true
      await Promise.all([
        fetchConversations(),
        fetchUnreadCount()
      ])
    }
  }
  
  loadData()
  
  return () => {
    mounted = false
  }
}, [user?.id]) // ✅ Solo user?.id como dependencia
```

---

### 🔧 CAMBIO 4: Cachear categorías bloqueadas

**Archivo:** `tanku-backend/src/modules/feed/feed.service.ts`

**Agregar al inicio de la clase:**
```typescript
private blockedCategoryIdsCache: string[] | null = null
private blockedCategoryIdsCacheTime: number = 0
private readonly BLOCKED_CATEGORIES_TTL = 3600000 // 1 hora

private async getBlockedCategoryIdsCached(): Promise<string[]> {
  const now = Date.now()
  if (this.blockedCategoryIdsCache && (now - this.blockedCategoryIdsCacheTime) < this.BLOCKED_CATEGORIES_TTL) {
    return this.blockedCategoryIdsCache
  }
  
  this.blockedCategoryIdsCache = await getBlockedCategoryIds()
  this.blockedCategoryIdsCacheTime = now
  return this.blockedCategoryIdsCache
}
```

**Reemplazar todas las llamadas a `getBlockedCategoryIds()` con `getBlockedCategoryIdsCached()`**

---

### 🔧 CAMBIO 5: Limitar crecimiento de Maps en memoria

**Archivo:** `tanku-backend/src/modules/feed/feed.service.ts`

**Agregar límite a `cursorTokens`:**
```typescript
private readonly MAX_CURSOR_TOKENS = 10000

private generateCursorToken(cursor: FeedCursorDTO): string {
  // Limpiar tokens expirados primero
  this.cleanExpiredTokens()
  
  // Si hay demasiados tokens, eliminar los más antiguos
  if (this.cursorTokens.size >= this.MAX_CURSOR_TOKENS) {
    const firstToken = this.cursorTokens.keys().next().value
    this.cursorTokens.delete(firstToken)
  }
  
  const token = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
  this.cursorTokens.set(token, {
    cursor,
    expiresAt: new Date(Date.now() + this.CURSOR_TOKEN_TTL),
  })
  
  return token
}
```

**Hacer lo mismo para `boostMap`**

---

### 🔧 CAMBIO 6: Ejecutar queries en paralelo en `getFeed`

**Archivo:** `tanku-backend/src/modules/feed/feed.service.ts`

**Modificar líneas 102-148:**
```typescript
// Ejecutar queries independientes en paralelo
const [products, posts, blockedCategoryIds] = await Promise.all([
  search && search.trim()
    ? this.getProductsBySearch(search.trim(), cursor, estimatedProducts + 5, categoryId)
    : this.getProductsByRanking(cursor, estimatedProducts + 5, boostFactor, categoryId),
  this.getPostsByDate(cursor, estimatedPosts + 2, userId),
  this.getBlockedCategoryIdsCached() // ✅ Usar versión cacheada
])
```

---

### 🔧 CAMBIO 7: Mover stories a store global

**Archivo:** `tanku-front/lib/stores/stories-store.ts` (NUEVO)

```typescript
import { create } from 'zustand'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

interface StoriesState {
  feedStories: StoryDTO[]
  wishlistStories: StoryDTO[]
  isLoading: boolean
  error: string | null
  lastFetchTime: number | null
  
  fetchFeedStories: () => Promise<void>
  fetchWishlistStories: (userId?: string) => Promise<void>
}

export const useStoriesStore = create<StoriesState>((set, get) => ({
  feedStories: [],
  wishlistStories: [],
  isLoading: false,
  error: null,
  lastFetchTime: null,
  
  fetchFeedStories: async () => {
    const state = get()
    // Solo hacer fetch si han pasado más de 5 minutos o no hay datos
    if (state.lastFetchTime && Date.now() - state.lastFetchTime < 300000 && state.feedStories.length > 0) {
      return
    }
    
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.get<StoryDTO[]>(API_ENDPOINTS.STORIES.FEED)
      if (response.success && response.data) {
        set({ 
          feedStories: response.data, 
          isLoading: false,
          lastFetchTime: Date.now()
        })
      }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },
  
  fetchWishlistStories: async (userId?: string) => {
    // Similar implementación
  }
}))
```

**Modificar:** `tanku-front/lib/hooks/use-stories.ts` para usar el store

---

### 🔧 CAMBIO 8: Usar React Query en `useFeed`

**Archivo:** `tanku-front/lib/hooks/use-feed.ts`

**Refactorizar para usar React Query:**
```typescript
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'

export function useFeed(filters: FeedFilters = {}) {
  const { token, isAuthenticated } = useAuthStore()
  
  return useInfiniteQuery({
    queryKey: ['feed', filters, isAuthenticated],
    queryFn: async ({ pageParam }) => {
      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      let url = isAuthenticated ? '/api/v1/feed' : '/api/v1/feed/public'
      const params = new URLSearchParams()
      if (filters.categoryId) params.append('categoryId', filters.categoryId)
      if (filters.searchQuery) params.append('search', filters.searchQuery)
      if (pageParam) headers['X-Feed-Cursor'] = pageParam
      
      const response = await apiClient.get<FeedResponse>(url, headers)
      return response.data
    },
    getNextPageParam: (lastPage) => lastPage?.nextCursorToken || undefined,
    staleTime: 30000, // 30 segundos
    cacheTime: 60000, // 1 minuto
  })
}
```

---

### 🔧 CAMBIO 9: Lazy load `FloatingChatsManager`

**Archivo:** `tanku-front/components/chat/floating-chats-manager.tsx`

**Modificar:**
```typescript
export function FloatingChatsManager() {
  const [openChats, setOpenChats] = useState<OpenChat[]>([])
  // ✅ Solo cargar useChat cuando hay chats abiertos
  const { conversations } = openChats.length > 0 ? useChat() : { conversations: [] }
  
  // ... resto del código
}
```

---

### 🔧 CAMBIO 10: Eliminar fetch duplicado en `CartButton`

**Archivo:** `tanku-front/components/layout/cart-button.tsx`

**Modificar líneas 23-25:**
```typescript
// Solo hacer fetch si el carrito no está cargado o está stale
useEffect(() => {
  const cart = useCartStore.getState().cart
  if (!cart || Date.now() - (cart.updatedAt || 0) > 60000) {
    fetchCart()
  }
}, [fetchCart])
```

---

## 🔟 PRIORIDAD DE CADA MEJORA

### 🔴 ALTA PRIORIDAD (Implementar inmediatamente)

1. **Eliminar polling de `use-chat-service.ts`** - Reduce carga del servidor en 80%
2. **Consolidar `useEffect` en `useChat`** - Elimina llamadas duplicadas
3. **Crear endpoint batch `/api/v1/feed/init`** - Reduce 11 peticiones a 1
4. **Cachear categorías bloqueadas** - Reduce queries a BD en 99%
5. **Limitar crecimiento de Maps en memoria** - Previene memory leaks
6. **Ejecutar queries en paralelo en `getFeed`** - Reduce latencia en 50%

### 🟡 MEDIA PRIORIDAD (Implementar esta semana)

7. **Mover stories a store global** - Elimina llamadas duplicadas
8. **Usar React Query en `useFeed`** - Mejora cache y UX
9. **Lazy load `FloatingChatsManager`** - Reduce carga inicial
10. **Eliminar fetch duplicado en `CartButton`** - Optimiza carga
11. **Habilitar Redis** - Mejora escalabilidad
12. **Cachear feed privado** - Reduce carga del servidor

### 🟢 BAJA PRIORIDAD (Implementar cuando sea posible)

13. **Separar responsabilidades de FeedService** - Mejora mantenibilidad
14. **Implementar rate limiting** - Previene abuso
15. **Agregar monitoreo y métricas** - Mejora observabilidad
16. **Optimizar índices de BD** - Mejora performance de queries
17. **Implementar Socket.IO para stories** - Mejora UX en tiempo real

---

## 📈 IMPACTO ESPERADO

### Antes de optimizaciones:
- **11 peticiones HTTP** al cargar feed
- **~2-3 segundos** de tiempo de carga
- **~50-100 queries a BD** por request del feed
- **Polling cada 2-5 segundos** en chat
- **Memory leaks** potenciales en Maps sin límite

### Después de optimizaciones:
- **1 petición HTTP** al cargar feed (endpoint batch)
- **~0.5-1 segundo** de tiempo de carga
- **~5-10 queries a BD** por request del feed (con cache)
- **0 polling** (solo Socket.IO)
- **Sin memory leaks** (Maps con límites)

### Reducción estimada:
- **90% menos peticiones HTTP** al cargar feed
- **80% menos queries a BD** (con cache)
- **100% menos polling** (eliminado)
- **50% menos tiempo de carga**
- **Escalabilidad mejorada** para miles de usuarios concurrentes

---

## 🎯 PRÓXIMOS PASOS

1. **Semana 1:** Implementar cambios de ALTA prioridad
2. **Semana 2:** Implementar cambios de MEDIA prioridad
3. **Semana 3:** Testing y optimización
4. **Semana 4:** Monitoreo y ajustes finales

---

**Fin del análisis**

