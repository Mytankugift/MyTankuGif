# 🚀 PLAN DE ACCIÓN - Roadmap MyTankuGif

## 📋 RESUMEN EJECUTIVO

**Estado del Proyecto:** Base sólida con módulos clave implementados  
**Bloqueantes Críticos:** Chat y StalkerGift  
**Tiempo Estimado Total:** 80-120 horas  
**Recomendación:** Implementar por fases, empezando por lo bloqueante

---

## 🎯 FASES DE IMPLEMENTACIÓN

---

## 🔴 FASE 1: INFRAESTRUCTURA DE CHAT (BLOQUEANTE)

**Tiempo estimado:** 12-18 horas  
**Prioridad:** 🔴 CRÍTICA

### Paso 1.1: Modelos de Chat en Prisma
**Archivo:** `tanku-backend/prisma/schema.prisma`

**Acción:**
1. Agregar modelos `Conversation`, `ConversationParticipant`, `Message`
2. Agregar enums `ConversationType`, `ConversationStatus`, `MessageType`, `MessageStatus`
3. Relacionar con `User`, `StalkerGift`
4. Ejecutar migración: `npm run prisma:migrate`

**Código a agregar:**
```prisma
model Conversation {
  id            String   @id @default(cuid())
  type          ConversationType @default(FRIENDS)
  status        ConversationStatus @default(ACTIVE)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  
  participants  ConversationParticipant[]
  messages      Message[]
  stalkerGift   StalkerGift?
  
  @@index([type, status])
  @@map("conversations")
}

model ConversationParticipant {
  id             String   @id @default(cuid())
  conversationId String   @map("conversation_id")
  userId         String   @map("user_id")
  alias          String?
  isRevealed     Boolean  @default(false) @map("is_revealed")
  createdAt      DateTime @default(now()) @map("created_at")
  
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  user           User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([conversationId, userId])
  @@index([conversationId])
  @@index([userId])
  @@map("conversation_participants")
}

model Message {
  id             String   @id @default(cuid())
  conversationId String   @map("conversation_id")
  senderId       String   @map("sender_id")
  senderAlias    String?  @map("sender_alias")
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

enum ConversationType {
  FRIENDS
  STALKERGIFT
}

enum ConversationStatus {
  ACTIVE
  CLOSED
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

**También agregar en User:**
```prisma
model User {
  // ... campos existentes
  conversations  ConversationParticipant[]
  messages       Message[]
}
```

---

### Paso 1.2: Implementar ChatService
**Archivo:** `tanku-backend/src/modules/chat/chat.service.ts`

**Reemplazar contenido actual con:**
```typescript
import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../shared/errors/AppError';

export class ChatService {
  /**
   * Crear o obtener conversación entre dos usuarios
   */
  async createOrGetConversation(
    userId: string,
    participantId: string,
    type: 'FRIENDS' | 'STALKERGIFT' = 'FRIENDS',
    alias?: { userId: string; participantId: string }
  ) {
    // Buscar conversación existente
    const existing = await prisma.conversation.findFirst({
      where: {
        type,
        participants: {
          every: {
            userId: { in: [userId, participantId] },
          },
        },
      },
      include: { participants: true },
    });

    if (existing) {
      return existing;
    }

    // Crear nueva conversación
    const conversation = await prisma.conversation.create({
      data: {
        type,
        status: 'ACTIVE',
        participants: {
          create: [
            {
              userId,
              alias: alias?.userId,
            },
            {
              userId: participantId,
              alias: alias?.participantId,
            },
          ],
        },
      },
      include: { participants: true },
    });

    return conversation;
  }

  /**
   * Obtener conversaciones de un usuario
   */
  async getConversations(userId: string) {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId },
        },
        status: 'ACTIVE',
      },
      include: {
        participants: {
          include: { user: { include: { profile: true } } },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return conversations;
  }

  /**
   * Obtener mensajes de una conversación
   */
  async getMessages(conversationId: string, userId: string, page: number = 1, limit: number = 50) {
    // Verificar acceso
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
      },
    });

    if (!participant) {
      throw new ForbiddenError('No tienes acceso a esta conversación');
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: { include: { profile: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return messages.reverse(); // Más antiguos primero
  }

  /**
   * Enviar mensaje
   */
  async sendMessage(conversationId: string, userId: string, content: string, type: 'TEXT' | 'IMAGE' | 'FILE' = 'TEXT') {
    // Verificar acceso
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
      },
    });

    if (!participant) {
      throw new ForbiddenError('No tienes acceso a esta conversación');
    }

    // Obtener alias si existe
    const senderAlias = participant.alias || null;

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        senderAlias,
        content,
        type,
        status: 'SENT',
      },
      include: {
        sender: { include: { profile: true } },
      },
    });

    // Actualizar última actividad de la conversación
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  /**
   * Marcar mensajes como leídos
   */
  async markAsRead(conversationId: string, userId: string) {
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        status: { not: 'READ' },
      },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    });
  }

  /**
   * Obtener contador de no leídos
   */
  async getUnreadCount(userId: string) {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId },
        },
        status: 'ACTIVE',
      },
      include: {
        messages: {
          where: {
            senderId: { not: userId },
            status: { not: 'READ' },
          },
        },
      },
    });

    let total = 0;
    conversations.forEach((conv) => {
      total += conv.messages.length;
    });

    return total;
  }
}
```

---

### Paso 1.3: Integrar Socket con Chat
**Archivo:** `tanku-backend/src/shared/realtime/socket.service.ts`

**Agregar método:**
```typescript
private registerChatHandlers() {
  if (!this.io) return;

  this.io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    if (!userId) return;

    // Unirse a conversaciones del usuario
    socket.on('chat:join', async (conversationId: string) => {
      // Validar acceso
      const participant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId,
        },
      });

      if (participant) {
        socket.join(`conversation:${conversationId}`);
        console.log(`✅ [SOCKET] Usuario ${userId} unido a conversación ${conversationId}`);
      }
    });

    // Enviar mensaje
    socket.on('chat:message', async (data: { conversationId: string; content: string; type?: string }) => {
      try {
        const chatService = new ChatService();
        const message = await chatService.sendMessage(
          data.conversationId,
          userId,
          data.content,
          (data.type as any) || 'TEXT'
        );

        // Emitir a todos en la conversación
        this.io!.to(`conversation:${data.conversationId}`).emit('chat:message', message);
      } catch (error: any) {
        socket.emit('chat:error', { message: error.message });
      }
    });

    // Typing indicator
    socket.on('chat:typing', (data: { conversationId: string; isTyping: boolean }) => {
      socket.to(`conversation:${data.conversationId}`).emit('chat:typing', {
        userId,
        conversationId: data.conversationId,
        isTyping: data.isTyping,
      });
    });

    // Read receipt
    socket.on('chat:read', async (data: { conversationId: string }) => {
      try {
        const chatService = new ChatService();
        await chatService.markAsRead(data.conversationId, userId);

        // Notificar al remitente
        this.io!.to(`conversation:${data.conversationId}`).emit('chat:read', {
          conversationId: data.conversationId,
          userId,
        });
      } catch (error: any) {
        socket.emit('chat:error', { message: error.message });
      }
    });
  });
}
```

**Llamar en `setupConnectionHandlers()`:**
```typescript
this.registerChatHandlers();
```

---

### Paso 1.4: Frontend - Hook useSocket
**Archivo:** `tanku-front/lib/hooks/useSocket.ts` (crear nuevo)

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '@/lib/context/auth-context'

export function useSocket() {
  const { user, token } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!user || !token) return

    const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000', {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    newSocket.on('connect', () => {
      console.log('✅ [SOCKET] Conectado')
      setIsConnected(true)
    })

    newSocket.on('disconnect', () => {
      console.log('❌ [SOCKET] Desconectado')
      setIsConnected(false)
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [user, token])

  const joinConversation = useCallback((conversationId: string) => {
    if (socket) {
      socket.emit('chat:join', conversationId)
    }
  }, [socket])

  const sendMessage = useCallback((conversationId: string, content: string, type: string = 'TEXT') => {
    if (socket) {
      socket.emit('chat:message', { conversationId, content, type })
    }
  }, [socket])

  const sendTyping = useCallback((conversationId: string, isTyping: boolean) => {
    if (socket) {
      socket.emit('chat:typing', { conversationId, isTyping })
    }
  }, [socket])

  const markAsRead = useCallback((conversationId: string) => {
    if (socket) {
      socket.emit('chat:read', { conversationId })
    }
  }, [socket])

  return {
    socket,
    isConnected,
    joinConversation,
    sendMessage,
    sendTyping,
    markAsRead,
  }
}
```

---

## 🔴 FASE 2: STALKERGIFT - MODELO Y ESTRUCTURA BASE

**Tiempo estimado:** 4-6 horas  
**Prioridad:** 🔴 CRÍTICA

### Paso 2.1: Corregir Modelo StalkerGift
**Archivo:** `tanku-backend/prisma/schema.prisma`

**Modificar modelo existente:**
```prisma
model StalkerGift {
  id                  String   @id @default(cuid())
  senderId            String   @map("sender_id")
  receiverId          String?  @map("receiver_id")
  externalReceiverData Json?   @map("external_receiver_data")
  productId           String   @map("product_id")
  variantId           String?  @map("variant_id")
  quantity            Int      @default(1)
  
  estado              StalkerGiftStatus @default(CREATED)
  paymentId           String?  @map("payment_id")
  paymentStatus       String   @default("pending") @map("payment_status")
  paymentMethod       String   @default("epayco") @map("payment_method")
  transactionId       String?  @map("transaction_id")
  
  senderAlias         String   @map("sender_alias")
  senderMessage       String?  @map("sender_message")
  
  uniqueLink          String?  @unique @map("unique_link")
  linkToken           String?  @unique @map("link_token")
  
  orderId             String?  @unique @map("order_id")
  order               Order?   @relation("OrderStalkerGift", fields: [orderId], references: [id])
  
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

**Agregar relación en Product:**
```prisma
model Product {
  // ... campos existentes
  stalkerGifts  StalkerGift[]
}
```

**Agregar relación en ProductVariant:**
```prisma
model ProductVariant {
  // ... campos existentes
  stalkerGifts  StalkerGift[]
}
```

---

### Paso 2.2: Crear Módulo StalkerGift
**Estructura:**
```
tanku-backend/src/modules/stalker-gift/
  - stalker-gift.service.ts
  - stalker-gift.controller.ts
  - stalker-gift.routes.ts
  - stalker-gift.schemas.ts
```

**Crear servicio básico:**
```typescript
// stalker-gift.service.ts
import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../shared/errors/AppError';
import crypto from 'crypto';

export class StalkerGiftService {
  /**
   * Crear StalkerGift
   */
  async createStalkerGift(data: {
    senderId: string;
    receiverId?: string;
    externalReceiverData?: any;
    productId: string;
    variantId?: string;
    quantity: number;
    senderAlias: string;
    senderMessage?: string;
  }) {
    const stalkerGift = await prisma.stalkerGift.create({
      data: {
        senderId: data.senderId,
        receiverId: data.receiverId || null,
        externalReceiverData: data.externalReceiverData || null,
        productId: data.productId,
        variantId: data.variantId || null,
        quantity: data.quantity,
        senderAlias: data.senderAlias,
        senderMessage: data.senderMessage || null,
        estado: 'CREATED',
      },
      include: {
        product: true,
        variant: true,
        sender: { include: { profile: true } },
        receiver: { include: { profile: true } },
      },
    });

    return stalkerGift;
  }

  /**
   * Generar link único
   */
  async generateUniqueLink(stalkerGiftId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const link = `${process.env.FRONTEND_URL}/stalkergift/accept/${token}`;

    await prisma.stalkerGift.update({
      where: { id: stalkerGiftId },
      data: {
        uniqueLink: link,
        linkToken: token,
      },
    });

    return link;
  }

  /**
   * Obtener StalkerGift por token
   */
  async getStalkerGiftByToken(token: string) {
    const stalkerGift = await prisma.stalkerGift.findUnique({
      where: { linkToken: token },
      include: {
        product: true,
        variant: true,
        sender: { include: { profile: true } },
      },
    });

    if (!stalkerGift) {
      throw new NotFoundError('Regalo no encontrado');
    }

    return stalkerGift;
  }

  /**
   * Aceptar StalkerGift
   */
  async acceptStalkerGift(stalkerGiftId: string, receiverId: string, addressId: string) {
    const stalkerGift = await prisma.stalkerGift.findUnique({
      where: { id: stalkerGiftId },
    });

    if (!stalkerGift) {
      throw new NotFoundError('Regalo no encontrado');
    }

    if (stalkerGift.estado !== 'WAITING_ACCEPTANCE') {
      throw new BadRequestError('El regalo no está en estado de espera de aceptación');
    }

    // Actualizar con receiverId
    const updated = await prisma.stalkerGift.update({
      where: { id: stalkerGiftId },
      data: {
        receiverId,
        estado: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    });

    // Aquí se creará la orden Dropi (en otro método)
    return updated;
  }
}
```

---

## 📝 NOTAS IMPORTANTES

1. **Migraciones:** Después de cada cambio en `schema.prisma`, ejecutar:
   ```bash
   npm run prisma:migrate
   ```

2. **Variables de entorno:** Asegurar que existan:
   - `FRONTEND_URL`
   - `NEXT_PUBLIC_API_URL`

3. **Testing:** Probar cada fase antes de continuar

4. **Documentación:** Actualizar README.md con cada nuevo endpoint

---

## 🎯 SIGUIENTE PASO RECOMENDADO

Después de completar FASE 1 y FASE 2, continuar con:
- **FASE 3:** Flujo 1 StalkerGift (externo) - 20-30 horas
- **FASE 4:** Flujo 2 StalkerGift (interno) - 15-20 horas
- **FASE 5:** Mejoras sociales - 10-15 horas

