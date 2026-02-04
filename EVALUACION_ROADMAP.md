# 📋 EVALUACIÓN DEL ROADMAP - MyTankuGif

## 🔍 RESUMEN EJECUTIVO

**Fecha de evaluación:** 2025-01-XX  
**Estado general:** El proyecto tiene una base sólida con varios módulos implementados, pero faltan componentes críticos para completar el roadmap.

---

## ✅ LO QUE YA EXISTE (Base Sólida)

### 1. **Infraestructura Base**
- ✅ **Socket.IO**: Servicio básico funcionando con autenticación JWT y rooms
- ✅ **Modelos Prisma**: Base de datos bien estructurada
- ✅ **Sistema de autenticación**: Funcional
- ✅ **Checkout y ePayco**: Sistema completo de pagos

### 2. **Sistema Social (Parcialmente Implementado)**
- ✅ **Friends**: Sistema completo (solicitudes, aceptación, bloqueo)
- ✅ **Posts (Poster)**: Servicio completo con likes y comentarios
- ✅ **Stories**: Modelo y servicio básico implementado
- ✅ **Notifications**: Sistema de notificaciones funcionando
- ✅ **UserProfile**: Perfiles de usuario con avatar, banner, bio

### 3. **E-commerce**
- ✅ **Productos**: Sistema completo
- ✅ **Carrito**: Funcional
- ✅ **Órdenes**: Sistema completo con integración Dropi
- ✅ **Wishlists**: Implementado con privacidad

---

## ❌ LO QUE FALTA (Crítico)

### 1. **Chat en Tiempo Real** 🔴 BLOQUEANTE
- ❌ **Modelos de Chat**: Solo existen modelos Mongoose (no Prisma)
- ❌ **Servicio de Chat**: Preparado pero NO implementado
- ❌ **Integración Socket-Chat**: No existe
- ❌ **Frontend de Chat**: Página existe pero redirige al feed

### 2. **Sistema StalkerGift** 🔴 BLOQUEANTE
- ⚠️ **Modelo Prisma**: Existe pero vinculado a Order (no independiente)
- ❌ **Servicio Backend**: NO existe módulo/servicio
- ❌ **Controlador/Rutas**: NO existen
- ❌ **Frontend**: Solo hay referencias, no implementación
- ❌ **Flujos**: Ninguno implementado

### 3. **Sistema de Posts (Feed Social)**
- ⚠️ **Posts**: Existe "Poster" pero no "Post" (confusión de nombres)
- ⚠️ **Feed**: Existe pero solo muestra posters del usuario, no de amigos
- ❌ **Feed de amigos**: No implementado

---

## 📊 EVALUACIÓN POR PRIORIDAD

---

# 🔴 PRIORIDAD 1 — INFRAESTRUCTURA BASE (BLOQUEANTE)

## 1. Chat en tiempo real (Socket) — BASE DEL SISTEMA SOCIAL

### Estado Actual:
- ✅ Socket.IO básico funcionando
- ❌ Modelos de Chat NO existen en Prisma (solo Mongoose)
- ❌ Servicio de Chat NO implementado
- ❌ Integración Socket-Chat NO existe

### 1.1 Definir modelo de conversación

**Estado:** ❌ NO EXISTE

**Acción requerida:**
```prisma
// Agregar a schema.prisma
model Conversation {
  id            String   @id @default(cuid())
  type          ConversationType @default(FRIENDS)
  status        ConversationStatus @default(ACTIVE)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  
  participants  ConversationParticipant[]
  messages      Message[]
  
  // Metadata para StalkerGift
  stalkerGiftId String?  @unique @map("stalker_gift_id")
  stalkerGift   StalkerGift? @relation(fields: [stalkerGiftId], references: [id])
  
  @@index([type, status])
  @@map("conversations")
}

model ConversationParticipant {
  id             String   @id @default(cuid())
  conversationId String   @map("conversation_id")
  userId         String   @map("user_id")
  alias          String?  // Para anonimato en StalkerGift
  isRevealed     Boolean  @default(false) @map("is_revealed")
  createdAt      DateTime @default(now()) @map("created_at")
  
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  user           User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([conversationId, userId])
  @@index([conversationId])
  @@index([userId])
  @@map("conversation_participants")
}

enum ConversationType {
  FRIENDS
  STALKERGIFT
}

enum ConversationStatus {
  ACTIVE
  CLOSED
}
```

**Depende de:** Nada  
**Bloquea:** Todo el sistema de chat y StalkerGift  
**Prioridad:** 🔴 MUY ALTA  
**Esfuerzo:** 2-3 horas

---

### 1.2 Definir modelo de mensajes

**Estado:** ❌ NO EXISTE

**Acción requerida:**
```prisma
model Message {
  id             String   @id @default(cuid())
  conversationId String   @map("conversation_id")
  senderId       String   @map("sender_id")
  senderAlias    String?  @map("sender_alias") // Para anonimato
  content        String   @db.Text
  type           MessageType @default(TEXT)
  status         MessageStatus @default(SENT)
  readAt         DateTime? @map("read_at")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")
  
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  sender         User         @relation(fields: [senderId], references: [id])
  
  @@index([conversationId, createdAt])
  @@index([senderId])
  @@map("messages")
}

enum MessageType {
  TEXT
  IMAGE
  FILE
}

enum MessageStatus {
  SENT
  DELIVERED
  READ
}
```

**Depende de:** 1.1 (Conversation)  
**Bloquea:** Sistema de mensajería  
**Prioridad:** 🔴 MUY ALTA  
**Esfuerzo:** 1-2 horas

---

### 1.3 Implementar Socket Server (tiempo real, NO on-demand)

**Estado:** ⚠️ PARCIAL

**Lo que existe:**
- ✅ Socket.IO inicializado con autenticación
- ✅ Sistema de rooms básico
- ✅ Emitir a usuarios/rooms

**Lo que falta:**
- ❌ Handlers específicos para chat
- ❌ Rooms por conversationId
- ❌ Eventos de typing, read receipts

**Acción requerida:**
```typescript
// En socket.service.ts, agregar handlers de chat
private registerChatHandlers() {
  this.io?.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    
    // Unirse a conversaciones del usuario
    socket.on('chat:join', async (conversationId: string) => {
      // Validar acceso
      // Unirse a room: conversation:${conversationId}
    });
    
    // Enviar mensaje
    socket.on('chat:message', async (data: { conversationId, content }) => {
      // Guardar en BD
      // Emitir a room
    });
    
    // Typing indicator
    socket.on('chat:typing', (data: { conversationId, isTyping }) => {
      socket.to(`conversation:${data.conversationId}`).emit('chat:typing', data);
    });
    
    // Read receipt
    socket.on('chat:read', async (data: { conversationId, messageId }) => {
      // Actualizar en BD
      // Notificar al remitente
    });
  });
}
```

**Depende de:** 1.1, 1.2  
**Bloquea:** Chat en tiempo real  
**Prioridad:** 🔴 MUY ALTA  
**Esfuerzo:** 4-6 horas

---

### 1.4 Integrar Socket con frontend

**Estado:** ❌ NO EXISTE

**Acción requerida:**
1. Crear hook `useSocket` en frontend
2. Conectar al iniciar sesión
3. Suscribirse a conversaciones activas
4. Render en tiempo real

**Depende de:** 1.3  
**Bloquea:** UI de chat  
**Prioridad:** 🔴 MUY ALTA  
**Esfuerzo:** 3-4 horas

---

### 1.5 Lógica de cierre de chat

**Estado:** ❌ NO EXISTE

**Acción requerida:**
- Cierre manual: endpoint para cambiar status a CLOSED
- Cierre automático: cuando se acepta amistad en StalkerGift
- Redirección: lógica en frontend

**Depende de:** 1.1, 1.2  
**Prioridad:** 🟠 ALTA  
**Esfuerzo:** 2-3 horas

---

# 🔴 PRIORIDAD 2 — SISTEMA STALKERGIFT (CORE DEL NEGOCIO)

## 2. Servicio StalkerGift — Estructura Base

### Estado Actual:
- ⚠️ Modelo Prisma existe pero está mal diseñado (vinculado a Order)
- ❌ NO existe servicio/controlador
- ❌ NO existe módulo backend

### 2.1 Crear entidad `StalkerGift`

**Estado:** ⚠️ EXISTE PERO MAL DISEÑADO

**Problema actual:**
El modelo actual está vinculado a Order (`orderId`), pero según el roadmap, StalkerGift NO debe ser una Order. La Order se crea DESPUÉS de la aceptación.

**Acción requerida:**
```prisma
// Modificar schema.prisma
model StalkerGift {
  id                  String   @id @default(cuid())
  senderId            String   @map("sender_id")
  receiverId          String?  @map("receiver_id") // Nullable si es externo
  externalReceiverData Json?   @map("external_receiver_data") // { instagram, etc }
  productId           String   @map("product_id")
  variantId           String?  @map("variant_id")
  quantity            Int      @default(1)
  
  estado              StalkerGiftStatus @default(CREATED)
  paymentId           String?  @map("payment_id") // ePayco ref_payco
  paymentStatus       String   @default("pending") @map("payment_status")
  paymentMethod       String   @default("epayco") @map("payment_method")
  transactionId       String?  @map("transaction_id")
  
  // Datos del sender (anonimato)
  senderAlias         String   @map("sender_alias")
  senderMessage       String?  @map("sender_message")
  
  // Link único para receptor externo
  uniqueLink          String?  @unique @map("unique_link")
  linkToken           String?  @unique @map("link_token")
  
  // Orden Dropi (solo después de aceptación)
  orderId             String?  @unique @map("order_id")
  order               Order?   @relation("OrderStalkerGift", fields: [orderId], references: [id])
  
  // Chat
  chatEnabled         Boolean  @default(false) @map("chat_enabled")
  conversationId      String?  @unique @map("conversation_id")
  conversation        Conversation? @relation(fields: [conversationId], references: [id])
  
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")
  acceptedAt          DateTime? @map("accepted_at")
  
  sender              User     @relation("Giver", fields: [senderId], references: [id])
  receiver            User?    @relation("Recipient", fields: [receiverId], references: [id])
  product             Product  @relation(fields: [productId], references: [id])
  variant             ProductVariant? @relation(fields: [variantId], references: [id])
  
  @@index([senderId])
  @@index([receiverId])
  @@index([uniqueLink])
  @@index([linkToken])
  @@map("stalker_gifts")
}

enum StalkerGiftStatus {
  CREATED
  PAID
  WAITING_ACCEPTANCE
  ACCEPTED
  REJECTED
  CANCELLED
}
```

**Depende de:** Modelos base (User, Product, Order)  
**Bloquea:** Todo el flujo StalkerGift  
**Prioridad:** 🔴 MUY ALTA  
**Esfuerzo:** 2-3 horas (migración)

---

## 3. Flujo 1 — Regalo a usuario EXTERNO

### Estado: ❌ NO IMPLEMENTADO

### 3.1 UI: Inicio StalkerGift (sin page, desde sidebar)

**Estado:** ⚠️ Referencia en sidebar pero no implementada

**Acción requerida:**
- Crear página `/stalkergift` o modal
- Input para Instagram/datos externos
- Validaciones básicas

**Prioridad:** 🔴 MUY ALTA  
**Esfuerzo:** 2-3 horas

---

### 3.2 Listado de productos

**Estado:** ✅ Existe servicio de productos

**Acción requerida:**
- Endpoint específico para StalkerGift (50 productos)
- Marcar como "StalkerGift" en UI

**Prioridad:** 🔴 MUY ALTA  
**Esfuerzo:** 1-2 horas

---

### 3.3 Checkout StalkerGift (fork del checkout actual)

**Estado:** ⚠️ Checkout normal existe, falta fork

**Acción requerida:**
- Copiar checkout existente
- Agregar campo `nickname` obligatorio
- Forzar método de pago: SOLO ePayco
- NO crear orden Dropi (solo StalkerGift)

**Prioridad:** 🔴 MUY ALTA  
**Esfuerzo:** 4-6 horas

---

### 3.4 Pago con ePayco

**Estado:** ✅ Sistema de ePayco existe

**Acción requerida:**
- Modificar webhook para detectar StalkerGift
- Guardar paymentId en StalkerGift
- Cambiar estado a `WAITING_ACCEPTANCE`

**Prioridad:** 🔴 MUY ALTA  
**Esfuerzo:** 2-3 horas

---

### 3.5 Generación de link único

**Estado:** ❌ NO EXISTE

**Acción requerida:**
```typescript
// En stalker-gift.service.ts
async generateUniqueLink(stalkerGiftId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const link = `${env.FRONTEND_URL}/stalkergift/accept/${token}`;
  
  await prisma.stalkerGift.update({
    where: { id: stalkerGiftId },
    data: {
      uniqueLink: link,
      linkToken: token,
    },
  });
  
  return link;
}
```

**Prioridad:** 🔴 MUY ALTA  
**Esfuerzo:** 1-2 horas

---

### 3.6 Envío del link por Instagram

**Estado:** ❌ NO EXISTE

**Acción requerida:**
- Integración con API de Instagram (o manual)
- Mensaje anónimo
- NO revelar sender

**Nota:** Esto puede ser manual inicialmente (copiar link y enviar)

**Prioridad:** 🟡 MEDIA (puede ser manual)  
**Esfuerzo:** Variable (manual: 0, automatizado: 8-12 horas)

---

### 3.7 Página pública del receptor

**Estado:** ❌ NO EXISTE

**Acción requerida:**
- Crear página `/stalkergift/accept/[token]`
- Validar token
- Mostrar producto y mensaje
- Botones: Aceptar / Rechazar

**Prioridad:** 🔴 MUY ALTA  
**Esfuerzo:** 4-6 horas

---

### 3.8 Aceptación del regalo

**Estado:** ❌ NO EXISTE

**Acción requerida:**
- Login obligatorio (Google OAuth)
- Solicitar dirección
- Confirmar aceptación
- Cambiar estado a `ACCEPTED`

**Prioridad:** 🔴 MUY ALTA  
**Esfuerzo:** 4-6 horas

---

### 3.9 Creación de orden Dropi

**Estado:** ✅ Sistema de órdenes Dropi existe

**Acción requerida:**
- Solo después de aceptación
- Usar dirección confirmada
- Vincular con StalkerGift

**Prioridad:** 🔴 MUY ALTA  
**Esfuerzo:** 2-3 horas

---

### 3.10 Notificación al sender

**Estado:** ✅ Sistema de notificaciones existe

**Acción requerida:**
- Crear notificación cuando se acepta
- Desbloquear chat

**Prioridad:** 🔴 MUY ALTA  
**Esfuerzo:** 1-2 horas

---

### 3.11 Crear chat StalkerGift anónimo

**Estado:** ❌ NO EXISTE

**Acción requerida:**
- Crear Conversation con type STALKERGIFT
- Usar alias configurados
- NO revelar identidad

**Depende de:** 1.1, 1.2 (Chat)  
**Prioridad:** 🔴 MUY ALTA  
**Esfuerzo:** 3-4 horas

---

### 3.12 Propuesta de amistad anónima

**Estado:** ❌ NO EXISTE

**Acción requerida:**
- Endpoint para proponer amistad desde chat
- Doble aceptación
- Si ambos aceptan: crear amistad normal, cerrar chat StalkerGift

**Depende de:** 3.11, Friends  
**Prioridad:** 🟠 ALTA  
**Esfuerzo:** 3-4 horas

---

## 4. Flujo 2 — Regalo a usuario EXISTENTE

### Estado: ❌ NO IMPLEMENTADO

### 4.1 Selección de usuario interno

**Estado:** ✅ Sistema de usuarios existe

**Acción requerida:**
- UI para buscar/seleccionar usuario
- Validar que existe

**Prioridad:** 🔴 MUY ALTA  
**Esfuerzo:** 2-3 horas

---

### 4.2 Selección de producto desde wishlist

**Estado:** ✅ Wishlists existen

**Acción requerida:**
- Endpoint: obtener wishlist del receptor
- Filtrar solo productos del wishlist

**Prioridad:** 🔴 MUY ALTA  
**Esfuerzo:** 2-3 horas

---

### 4.3 Notificación al receptor

**Estado:** ✅ Sistema de notificaciones existe

**Acción requerida:**
- Crear notificación sin revelar identidad
- "Te llegó un regalo"

**Prioridad:** 🔴 MUY ALTA  
**Esfuerzo:** 1-2 horas

---

### 4.4 Aceptación del regalo

**Estado:** ❌ NO EXISTE

**Acción requerida:**
- Similar a flujo externo
- Confirmar/cambiar dirección

**Prioridad:** 🔴 MUY ALTA  
**Esfuerzo:** 3-4 horas

---

### 4.5 Crear orden Dropi

**Estado:** ✅ Existe

**Acción requerida:**
- Igual que flujo externo

**Prioridad:** 🔴 MUY ALTA  
**Esfuerzo:** 1-2 horas

---

### 4.6 Chat anónimo (aunque sean amigos)

**Estado:** ❌ NO EXISTE

**Acción requerida:**
- Crear chat anónimo incluso si son amigos
- Alias temporales
- Reveal opcional

**Depende de:** 3.11  
**Prioridad:** 🔴 MUY ALTA  
**Esfuerzo:** 3-4 horas

---

# 🟠 PRIORIDAD 3 — SISTEMA SOCIAL

## 5. Perfil de usuario y privacidad

### Estado Actual:
- ✅ UserProfile existe
- ✅ Wishlists con privacidad
- ⚠️ Falta configuración de privacidad de perfil

### 5.1 Perfil público / privado

**Estado:** ⚠️ PARCIAL

**Acción requerida:**
```prisma
// Agregar a UserProfile o PersonalInformation
model UserProfile {
  // ... campos existentes
  isPublic      Boolean  @default(true) @map("is_public")
  allowFriendRequests Boolean @default(true) @map("allow_friend_requests")
}
```

**Prioridad:** 🟠 ALTA  
**Esfuerzo:** 2-3 horas

---

### 5.2 Permitir solicitudes de amistad

**Estado:** ⚠️ PARCIAL

**Acción requerida:**
- Agregar flag en UserProfile
- Validar en FriendsService antes de crear solicitud

**Prioridad:** 🟠 ALTA  
**Esfuerzo:** 1-2 horas

---

### 5.3 Vista de perfil (amigos o no)

**Estado:** ⚠️ PARCIAL

**Acción requerida:**
- Endpoint para obtener perfil público
- Filtrar según privacidad
- Mostrar solo: Publicaciones, Wishlist pública, nombres de privadas

**Prioridad:** 🟠 ALTA  
**Esfuerzo:** 3-4 horas

---

### 5.4 Acceso a wishlist privada

**Estado:** ❌ NO EXISTE

**Acción requerida:**
- Sistema de solicitudes de acceso
- Aprobación manual
- Independiente de amistad

**Prioridad:** 🟡 MEDIA  
**Esfuerzo:** 4-6 horas

---

## 6. Sistema de publicaciones (Posts)

### Estado Actual:
- ✅ Existe "Poster" (posts con imagen/video)
- ⚠️ Confusión de nombres (Poster vs Post)
- ❌ Feed solo muestra posts del usuario, no de amigos

### 6.1 Crear post

**Estado:** ✅ EXISTE (como Poster)

**Acción requerida:**
- Ya existe, solo verificar que funciona

**Prioridad:** ✅ COMPLETADO

---

### 6.2 Feed

**Estado:** ⚠️ PARCIAL

**Problema:** Solo muestra posters del usuario, no de amigos

**Acción requerida:**
```typescript
// Modificar posters.service.ts
async getFeedPoster(userId: string): Promise<PosterDTO[]> {
  // Obtener amigos
  const friends = await prisma.friend.findMany({
    where: {
      OR: [
        { userId, status: 'accepted' },
        { friendId: userId, status: 'accepted' },
      ],
    },
  });
  
  const friendIds = friends.map(f => 
    f.userId === userId ? f.friendId : f.userId
  );
  
  // Obtener posters de amigos + propios
  const posters = await prisma.poster.findMany({
    where: {
      customerId: { in: [userId, ...friendIds] },
      isActive: true,
    },
    // ... resto
  });
}
```

**Prioridad:** 🟠 ALTA  
**Esfuerzo:** 2-3 horas

---

### 6.3 Likes

**Estado:** ✅ EXISTE (como PosterReaction)

**Prioridad:** ✅ COMPLETADO

---

### 6.4 Comentarios

**Estado:** ✅ EXISTE (como PosterComment)

**Acción requerida:**
- Agregar tiempo real con Socket si es posible

**Prioridad:** 🟡 MEDIA  
**Esfuerzo:** 2-3 horas (opcional)

---

## 7. Stories (24 horas)

### Estado Actual:
- ✅ Modelo y servicio básico existen
- ⚠️ Falta render en feed/friends/wishlist
- ⚠️ Falta expiración automática

### 7.1 Modelo de story

**Estado:** ✅ EXISTE

**Prioridad:** ✅ COMPLETADO

---

### 7.2 Render de stories

**Estado:** ❌ NO EXISTE

**Acción requerida:**
- Componente de stories en feed
- Componente en friends
- Componente en wishlist

**Prioridad:** 🟠 ALTA  
**Esfuerzo:** 4-6 horas

---

### 7.3 Expiración automática

**Estado:** ⚠️ PARCIAL (solo por timestamp)

**Acción requerida:**
- Cron job para limpiar stories expiradas
- O filtrar por `expiresAt > now()` en queries

**Prioridad:** 🟡 MEDIA  
**Esfuerzo:** 1-2 horas

---

# 🟡 PRIORIDAD 4 — SISTEMA INTERNO DE PRODUCTOS Y CRONS

## 8. Sistema local de reclasificación de productos

### Estado: ❌ NO EXISTE

**Prioridad:** 🟡 MEDIA  
**Esfuerzo:** 8-12 horas (app completa)

---

## 9. Visualización de crons

### Estado: ❌ NO EXISTE

**Prioridad:** 🟡 MEDIA  
**Esfuerzo:** 4-6 horas

---

## 🧩 DEPENDENCIAS CLAVE RESUMIDAS

### Orden de Implementación Recomendado:

1. **FASE 1 (BLOQUEANTE):**
   - 1.1, 1.2: Modelos de Chat (Prisma)
   - 1.3: Socket handlers de chat
   - 2.1: Modelo StalkerGift corregido
   - Crear módulo StalkerGift (servicio, controlador, rutas)

2. **FASE 2 (STALKERGIFT FLUJO 1):**
   - 3.1-3.12: Flujo completo externo
   - 3.11: Chat anónimo

3. **FASE 3 (STALKERGIFT FLUJO 2):**
   - 4.1-4.6: Flujo interno

4. **FASE 4 (SOCIAL):**
   - 5.1-5.3: Privacidad de perfil
   - 6.2: Feed de amigos
   - 7.2: Render de stories

5. **FASE 5 (OPCIONAL):**
   - 5.4: Acceso a wishlist privada
   - 8, 9: Sistema interno

---

## 📊 ESTIMACIÓN DE ESFUERZO TOTAL

- **PRIORIDAD 1 (Chat):** 12-18 horas
- **PRIORIDAD 2 (StalkerGift):** 40-60 horas
- **PRIORIDAD 3 (Social):** 15-25 horas
- **PRIORIDAD 4 (Interno):** 12-18 horas

**TOTAL:** ~80-120 horas de desarrollo

---

## ⚠️ DECISIONES IMPORTANTES

1. **Chat:** Migrar de Mongoose a Prisma (los modelos actuales son Mongoose)
2. **StalkerGift:** Rediseñar modelo para que NO dependa de Order inicialmente
3. **Posts:** Usar "Poster" existente o crear "Post" nuevo (recomendado: usar Poster)
4. **Feed:** Modificar para incluir posts de amigos
5. **Stories:** Ya existe, solo falta UI

---

## ✅ VIABILIDAD

**TODO ES VIABLE**, pero requiere:
- Reestructuración de modelos (Chat, StalkerGift)
- Creación de módulo completo StalkerGift
- Integración Socket-Chat
- Desarrollo de flujos completos

**Recomendación:** Empezar por FASE 1 (modelos y base), luego StalkerGift Flujo 1 (más crítico), luego el resto.

