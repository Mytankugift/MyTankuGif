# 🎁 Roadmap: Sistema de Regalos entre Usuarios

## 📋 Resumen del Flujo

- **Cada cuenta tiene DOS carritos independientes:**
  - **Carrito propio (normal)**: Para productos que el usuario compra para sí mismo
  - **Carrito de regalos**: Para productos que el usuario envía como regalo a otra persona

- **Agregar productos:**
  - Desde el feed o página de producto → Se agregan al **carrito propio**
  - Desde wishlist de alguien "enviar como regalo" → Se agregan al **carrito de regalos**

- **Carrito de regalos:**
  - Permite múltiples productos, pero **siempre destinados a la misma persona**
  - Si está vacío, se puede agregar cualquier producto de regalo
  - Si no está vacío, solo se pueden agregar productos del mismo usuario (mismo destinatario), aunque sean de distintas wishlists
  - Si se intenta agregar un producto de regalo para **otro usuario diferente**, se muestra una alerta con el nombre del destinatario actual y opciones: **Cancelar** o **Limpiar carrito y agregar**

- **Checkout:**
  - Desde el carrito de regalos se puede proceder al checkout y pago
  - Todo va directo a la persona destinataria
  - Solo método de pago: **Epayco** (no contraentrega)
  - El remitente **NO ve la dirección** del destinatario
  - El destinatario **NO ve los precios**, solo estados de Dropi

---

## Fase 1: Base de Datos y Esquema

### 1.1 Actualizar modelo Address
```prisma
model Address {
  // ... campos existentes
  isGiftAddress Boolean @default(false) @map("is_gift_address") // Nueva dirección específica para regalos
  // ... resto de campos
}
```

### 1.2 Actualizar modelo UserProfile
```prisma
model UserProfile {
  // ... campos existentes
  allowGiftShipping Boolean @default(false) @map("allow_gift_shipping") // Permite recibir regalos
  useMainAddressForGifts Boolean @default(false) @map("use_main_address_for_gifts") // Usa dirección principal para regalos
  // ... resto de campos
}
```

### 1.3 Actualizar modelo Cart
```prisma
model Cart {
  // ... campos existentes
  giftRecipientId String? @map("gift_recipient_id") // ID del usuario que recibirá el regalo
  isGiftCart Boolean @default(false) @map("is_gift_cart") // Indica si es carrito de regalos
  // ... resto de campos
}
```

### 1.4 Actualizar modelo Order
```prisma
model Order {
  // ... campos existentes
  isGiftOrder Boolean @default(false) @map("is_gift_order") // Indica si es orden de regalo
  giftSenderId String? @map("gift_sender_id") // Usuario que envió el regalo
  giftRecipientId String? @map("gift_recipient_id") // Usuario que recibe el regalo
  // ... resto de campos
}
```

### 1.5 Crear migración
- Agregar campos nuevos a las tablas existentes
- No crear tablas nuevas (reutilizar Cart y Order)

---

## Fase 2: Onboarding - Dirección Opcional

### 2.1 Crear componente OnboardingStepAddress
**Archivo**: `tanku-front/components/onboarding/onboarding-step-address.tsx`

- Paso opcional en el onboarding
- Usar módulo de direcciones existente
- Checkbox: "Usar esta dirección para recibir regalos de amigos"
- Checkbox: "Usar mi dirección principal para regalos" (si ya tiene dirección)
- Puede saltarse (no obligatorio)

### 2.2 Actualizar OnboardingModal
**Archivo**: `tanku-front/components/onboarding/onboarding-modal.tsx`

- Agregar paso de dirección (opcional, puede saltarse)
- Actualizar contador de pasos (5 pasos en total: username, birthday, categories, activities, address)
- Guardar preferencias de dirección en el backend

### 2.3 Backend - Actualizar endpoint de onboarding
**Archivo**: `tanku-backend/src/modules/users/users.service.ts` o endpoint de onboarding

- Actualizar endpoint para guardar dirección y preferencias
- Si marca "usar para regalos", guardar `allowGiftShipping = true` en UserProfile
- Si marca "usar dirección principal", guardar `useMainAddressForGifts = true`

---

## Fase 3: Backend - Servicios de Regalos

### 3.1 Crear GiftService
**Archivo**: `tanku-backend/src/modules/gifts/gift.service.ts`

**Métodos principales:**
- `validateGiftRecipient(userId: string)` - Validar si usuario puede recibir regalos
  - Retorna: `{ canReceive: boolean, hasAddress: boolean, allowGiftShipping: boolean, reason?: string }`
- `getGiftAddress(recipientId: string)` - Obtener dirección de envío (sin mostrar al remitente)
  - Retorna dirección pero sin datos sensibles para el remitente

### 3.2 Actualizar CartService
**Archivo**: `tanku-backend/src/modules/cart/cart.service.ts`

**Métodos a agregar/modificar:**
- `addItemToGiftCart(cartId: string, variantId: string, quantity: number, senderId: string, recipientId: string)`
  - Validar que `recipientId` tenga dirección configurada
  - Validar que el carrito no tenga otro `recipientId` diferente
  - Si el carrito tiene otro `recipientId`, limpiar items anteriores o rechazar
  - Agregar item con `giftRecipientId` y `isGiftCart = true`

- `getGiftCart(senderId: string, recipientId: string)`
  - Obtener o crear carrito de regalos para un destinatario específico
  - Validar que todos los items sean para el mismo destinatario

- `validateGiftCartConsistency(cartId: string, recipientId: string)`
  - Validar que todos los items del carrito sean para el mismo destinatario

### 3.3 Actualizar CheckoutService
**Archivo**: `tanku-backend/src/modules/checkout/checkout.service.ts`

**Modificaciones:**
- En `createOrderFromCheckout`:
  - Si `cart.isGiftCart = true`:
    - Validar que `cart.giftRecipientId` existe
    - Obtener dirección del destinatario (sin mostrarla al remitente)
    - Crear orden con `isGiftOrder = true`, `giftSenderId = userId`, `giftRecipientId = cart.giftRecipientId`
    - **NO permitir** método de pago `cash_on_delivery` (solo Epayco)
    - Usar dirección del destinatario para envío

### 3.4 Crear endpoints de Gift
**Archivo**: `tanku-backend/src/modules/gifts/gift.controller.ts` y `gift.routes.ts`

**Endpoints:**
- `GET /api/v1/gifts/recipient/:userId/eligibility` - Validar si usuario puede recibir regalos
- `GET /api/v1/gifts/orders` - Obtener regalos enviados y recibidos (con filtros de privacidad)

---

## Fase 4: Frontend - Agregar desde Wishlist

### 4.1 Actualizar WishlistProductCard
**Archivo**: `tanku-front/components/wishlists/wishlist-product-card.tsx`

**Cambios:**
```typescript
interface WishlistProductCardProps {
  item: WishListDTO['items'][0]
  onAddToCart: (variantId?: string) => Promise<void>
  onSendAsGift?: (variantId?: string) => Promise<void> // NUEVO
  wishlistOwnerId?: string // NUEVO - ID del dueño de la wishlist (destinatario)
  isOwnWishlist?: boolean // NUEVO - Si es true, no mostrar botón de regalo
}
```

- Mostrar botón "Enviar como regalo" solo si:
  - `wishlistOwnerId` existe
  - `isOwnWishlist === false` (no es tu propia wishlist)
- Al hacer clic, llamar `onSendAsGift`

### 4.2 Actualizar UserWishlistsTab
**Archivo**: `tanku-front/components/profile/user-wishlists-tab.tsx`

**Cambios:**
- Ya tiene acceso a `userId` (dueño de las wishlists)
- Pasar `wishlistOwnerId={userId}` a componentes de productos
- Pasar `isOwnWishlist={userId === currentUser?.id}`
- Crear función `handleSendAsGift` que:
  1. Valida que el destinatario puede recibir regalos
  2. Agrega al carrito de regalos
  3. Muestra mensaje de éxito o error

### 4.3 Actualizar MyWishlists
**Archivo**: `tanku-front/components/wishlists/my-wishlists.tsx`

**Cambios:**
- No mostrar botón "Enviar como regalo" (es tu propia wishlist)
- Pasar `isOwnWishlist={true}` a componentes

### 4.4 Actualizar SavedWishlistsViewer
**Archivo**: `tanku-front/components/wishlists/saved-wishlists-viewer.tsx`

**Cambios:**
- Pasar `wishlistOwnerId={wishlist.userId}` a componentes de productos
- Pasar `isOwnWishlist={wishlist.userId === currentUser?.id}`
- Crear función `handleSendAsGift` similar a UserWishlistsTab

### 4.5 Crear hook useGiftCart
**Archivo**: `tanku-front/lib/hooks/use-gift-cart.ts`

**Funcionalidad:**
```typescript
const useGiftCart = () => {
  const addToGiftCart = async (variantId: string, recipientId: string) => {
    // 1. Validar que recipientId puede recibir regalos
    // 2. Obtener o crear carrito de regalos
    // 3. Validar que el carrito no tenga otro recipientId
    // 4. Si tiene otro recipientId, mostrar confirmación para limpiar
    // 5. Agregar item al carrito de regalos
  }
  
  const getGiftCart = async (recipientId: string) => {
    // Obtener carrito de regalos para un destinatario
  }
  
  const clearGiftCart = async () => {
    // Limpiar carrito de regalos
  }
}
```

### 4.6 Actualizar CartStore (opcional)
**Archivo**: `tanku-front/lib/stores/cart-store.ts`

**Agregar:**
- Estado para `giftRecipientId` y `isGiftCart`
- Métodos para manejar carrito de regalos separado del carrito normal

---

## Fase 5: Frontend - Checkout de Regalos

### 5.1 Actualizar página de Checkout
**Archivo**: `tanku-front/app/(main)/checkout/page.tsx`

**Modificaciones:**
- Detectar si el carrito es de regalos (`isGiftCart === true`)
- Si es carrito de regalos:
  - Mostrar nombre del destinatario (sin dirección)
  - **Ocultar** opción de contraentrega (solo Epayco)
  - Mostrar mensaje: "Enviando regalo a [Nombre del destinatario]"
  - No mostrar formulario de dirección (se usa la del destinatario)
- Si no es carrito de regalos, mostrar flujo normal

### 5.2 Actualizar CheckoutPaymentMethod
**Archivo**: `tanku-front/components/checkout/checkout-payment-method.tsx`

**Modificaciones:**
- Si `isGiftCart === true`, ocultar opción "Contraentrega"
- Solo mostrar opción Epayco

### 5.3 Actualizar CheckoutSummary
**Archivo**: `tanku-front/components/checkout/checkout-summary.tsx`

**Modificaciones:**
- Si es carrito de regalos, mostrar información del destinatario
- No mostrar dirección de envío (privacidad)

---

## Fase 6: Notificaciones

### 6.1 Actualizar NotificationService
**Archivo**: `tanku-backend/src/modules/notifications/notification.service.ts`

**Agregar método:**
- `createGiftNotification(recipientId: string, orderId: string, senderId?: string)`
  - Crear notificación tipo `'gift_received'`
  - Mensaje: "¡Te han enviado un regalo! 🎁"
  - Incluir `orderId` y opcionalmente `senderId` (puede ser anónimo)

### 6.2 Integrar en CheckoutService
**Archivo**: `tanku-backend/src/modules/checkout/checkout.service.ts`

**Modificaciones:**
- Después de crear orden de regalo exitosamente, crear notificación para el destinatario

---

## Fase 7: Tab "Regalos" en Perfil

### 7.1 Backend - Endpoints para regalos
**Archivo**: `tanku-backend/src/modules/gifts/gift.controller.ts`

**Endpoints:**
- `GET /api/v1/gifts/orders?type=sent` - Regalos que he enviado
- `GET /api/v1/gifts/orders?type=received` - Regalos que he recibido

**Reglas de privacidad:**
- Si es remitente: excluir dirección del destinatario
- Si es destinatario: excluir precios (`price`, `finalPrice`, `subtotal`, `total`)
- Ambos pueden ver: estados de Dropi, productos, fechas

### 7.2 Crear componente GiftsTab
**Archivo**: `tanku-front/components/profile/gifts-tab.tsx`

**Funcionalidad:**
- Similar a `OrdersTab` y `StalkerGiftOrdersTab`
- Dos secciones:
  - **"Regalos enviados"** - Muestra a quién envié y estado
  - **"Regalos recibidos"** - Muestra quién envió (si no es anónimo) y estado
- Mostrar estados de Dropi (similar a órdenes normales)
- Manejar datos incompletos (mostrar "—" donde corresponda)

### 7.3 Actualizar ProfilePage
**Archivo**: `tanku-front/app/(main)/profile/page.tsx`

**Modificaciones:**
- Agregar `'REGALOS'` al array de tabs
- Renderizar `GiftsTab` cuando esté activo

---

## Fase 8: Validaciones y Edge Cases

### 8.1 Validaciones de carrito de regalos
- Al agregar producto de wishlist como regalo:
  - Verificar que destinatario tenga `allowGiftShipping = true`
  - Verificar que tenga dirección configurada o `useMainAddressForGifts = true`
- Si el carrito tiene otro `recipientId`:
  - Mostrar confirmación: "Tienes productos en el carrito para otra persona. ¿Deseas limpiar el carrito y agregar este producto?"
  - Si acepta: limpiar carrito y agregar nuevo producto
  - Si rechaza: cancelar operación

### 8.2 Validaciones de perfil
- Solo se pueden enviar regalos a:
  - Amigos (si el perfil no es público)
  - Cualquier usuario si el perfil es público
- Similar a stalkergift pero sin confirmación (directo)

### 8.3 Manejo de errores
- Si el destinatario elimina su dirección después de agregar al carrito:
  - Mostrar error al intentar checkout
  - Ofrecer limpiar carrito de regalos
- Si el destinatario cambia `allowGiftShipping` a false:
  - Mostrar error al intentar agregar más productos
  - Mostrar error al intentar checkout

### 8.4 Validaciones en checkout
- Si es carrito de regalos y método de pago es contraentrega:
  - Rechazar y mostrar error
- Si el destinatario ya no puede recibir regalos:
  - Rechazar checkout y mostrar error

---

## Fase 9: UI/UX y Refinamiento

### 9.1 Indicadores visuales
- Mostrar badge "Regalo" en carrito cuando `isGiftCart === true`
- Mostrar nombre del destinatario en carrito de regalos
- Diferencia visual entre carrito normal y carrito de regalos

### 9.2 Mensajes claros
- "Agregado al carrito de regalos para [Nombre]"
- "Tienes productos para otra persona en el carrito"
- "Este usuario no permite recibir regalos"
- "Este usuario no tiene dirección configurada"

### 9.3 Loading states
- Loading al validar destinatario
- Loading al agregar al carrito de regalos
- Loading en checkout de regalos

---

## Fase 10: Testing

### 10.1 Flujos a probar
1. ✅ Agregar producto de wishlist de otra persona como regalo
2. ✅ Agregar múltiples productos de la misma persona (diferentes wishlists)
3. ✅ Intentar agregar producto de otra persona (debe limpiar o rechazar)
4. ✅ Checkout de regalos (solo Epayco)
5. ✅ Validar privacidad de datos (remitente no ve dirección, destinatario no ve precios)
6. ✅ Notificaciones al recibir regalo
7. ✅ Tab de regalos en perfil
8. ✅ Estados de Dropi visibles para ambos

---

## 📝 Resumen de Archivos

### Nuevos archivos Backend:
- `src/modules/gifts/gift.service.ts`
- `src/modules/gifts/gift.controller.ts`
- `src/modules/gifts/gift.routes.ts`

### Nuevos archivos Frontend:
- `components/onboarding/onboarding-step-address.tsx`
- `components/profile/gifts-tab.tsx`
- `lib/hooks/use-gift-cart.ts`

### Archivos a modificar:
- `prisma/schema.prisma` - Agregar campos
- `components/onboarding/onboarding-modal.tsx` - Agregar paso de dirección
- `components/wishlists/wishlist-product-card.tsx` - Agregar botón de regalo
- `components/wishlists/my-wishlists.tsx` - Pasar props
- `components/profile/user-wishlists-tab.tsx` - Agregar función de regalo
- `components/wishlists/saved-wishlists-viewer.tsx` - Agregar función de regalo
- `app/(main)/checkout/page.tsx` - Detectar carrito de regalos
- `components/checkout/checkout-payment-method.tsx` - Ocultar contraentrega
- `components/checkout/checkout-summary.tsx` - Mostrar destinatario
- `app/(main)/profile/page.tsx` - Agregar tab "REGALOS"
- `src/modules/cart/cart.service.ts` - Agregar métodos de regalos
- `src/modules/checkout/checkout.service.ts` - Agregar lógica de regalos
- `src/modules/notifications/notification.service.ts` - Agregar notificaciones

---

## 🎯 Prioridades

1. **Fase 1** - Base de datos (crítico)
2. **Fase 2** - Onboarding (importante para UX)
3. **Fase 3** - Backend servicios (crítico)
4. **Fase 4** - Frontend wishlist (core feature)
5. **Fase 5** - Checkout (crítico)
6. **Fase 6** - Notificaciones (importante)
7. **Fase 7** - Tab regalos (nice to have)
8. **Fase 8-10** - Validaciones y testing (importante)

