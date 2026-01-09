# 💬 MÓDULO CHAT (Mensajería Directa)

## 📋 Estado

**⚠️ MÓDULO PREPARADO - NO IMPLEMENTADO**

Este módulo está preparado para implementar mensajería directa entre usuarios. **NO incluye chat grupal**, solo conversaciones 1-a-1.

---

## 🎯 Funcionalidad Planificada

- Crear/iniciar conversación directa
- Enviar mensajes
- Listar conversaciones del usuario
- Obtener mensajes de una conversación
- Marcar mensajes como leídos
- Indicadores de escritura (typing)
- Estado de entrega/lectura
- Integración completa con Socket.IO para mensajes en tiempo real

**⚠️ IMPORTANTE**: Este módulo es solo para chat directo (1-a-1). NO incluye chat grupal.

---

## 📐 Tablas Prisma Requeridas

### Migración a Crear

```prisma
model Conversation {
  id          String                    @id @default(cuid())
  type        String                    @default("direct") // 'direct' | 'group' (solo direct por ahora)
  createdAt   DateTime                  @default(now()) @map("created_at")
  updatedAt   DateTime                  @updatedAt @map("updated_at")
  lastMessageAt DateTime?               @map("last_message_at")
  
  participants ConversationParticipant[]
  messages     Message[]
  
  @@index([lastMessageAt])
  @@map("conversations")
}

model ConversationParticipant {
  id             String       @id @default(cuid())
  conversationId String       @map("conversation_id")
  userId         String       @map("user_id")
  lastReadAt     DateTime?    @map("last_read_at")
  joinedAt       DateTime     @default(now()) @map("joined_at")
  
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([conversationId, userId])
  @@index([userId])
  @@index([conversationId])
  @@map("conversation_participants")
}

model Message {
  id             String       @id @default(cuid())
  conversationId String       @map("conversation_id")
  userId         String       @map("user_id")
  content        String
  messageType    String       @default("text") @map("message_type") // 'text' | 'image' | 'file'
  fileUrl        String?      @map("file_url")
  isRead         Boolean      @default(false) @map("is_read")
  readAt         DateTime?    @map("read_at")
  createdAt      DateTime     @default(now()) @map("created_at")
  
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([conversationId, createdAt])
  @@index([userId])
  @@map("messages")
}
```

### Actualizar Modelo User

```prisma
model User {
  // ... campos existentes ...
  
  conversationParticipants ConversationParticipant[]
  messages                  Message[]
}
```

---

## 🛠️ Pasos para Implementar

### 1. Crear Migración Prisma

```bash
cd tanku-backend
npx prisma migrate dev --name add_chat_tables
```

### 2. Crear DTOs

Crear `src/shared/dto/chat.dto.ts`:

```typescript
export interface ConversationDTO {
  id: string;
  type: 'direct' | 'group';
  lastMessageAt: string | null;
  participants: ConversationParticipantDTO[];
  lastMessage: MessageDTO | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationParticipantDTO {
  id: string;
  userId: string;
  lastReadAt: string | null;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profile: {
      avatar: string | null;
    } | null;
  };
  joinedAt: string;
}

export interface MessageDTO {
  id: string;
  conversationId: string;
  userId: string;
  content: string;
  messageType: 'text' | 'image' | 'file';
  fileUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profile: {
      avatar: string | null;
    } | null;
  };
  createdAt: string;
}

export interface CreateConversationDTO {
  participantId: string; // Para conversaciones directas
}

export interface SendMessageDTO {
  conversationId: string;
  content: string;
  messageType?: 'text' | 'image' | 'file';
  fileUrl?: string;
}

export interface MarkAsReadDTO {
  conversationId: string;
  lastReadAt: string;
}
```

### 3. Implementar Service

En `chat.service.ts`:

- `createOrGetConversation(userId, participantId)` - crear/obtener conversación directa
- `getConversations(userId)` - listar conversaciones del usuario
- `getConversationById(conversationId, userId)` - obtener conversación
- `getMessages(conversationId, userId, pagination)` - obtener mensajes
- `sendMessage(conversationId, userId, data)` - enviar mensaje
- `markAsRead(conversationId, userId)` - marcar como leído
- `getUnreadCount(userId)` - contador de mensajes no leídos

### 4. Implementar Controller

En `chat.controller.ts`:

- `POST /api/v1/chat/conversations` - crear/iniciar conversación
- `GET /api/v1/chat/conversations` - listar conversaciones
- `GET /api/v1/chat/conversations/:id` - obtener conversación
- `GET /api/v1/chat/conversations/:id/messages` - obtener mensajes
- `POST /api/v1/chat/conversations/:id/messages` - enviar mensaje
- `PUT /api/v1/chat/conversations/:id/read` - marcar como leído
- `GET /api/v1/chat/unread-count` - contador de no leídos

### 5. Crear Routes

En `chat.routes.ts`:

```typescript
import { Router } from 'express';
import { ChatController } from './chat.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();
const chatController = new ChatController();

router.post('/conversations', authenticate, chatController.createOrGetConversation);
router.get('/conversations', authenticate, chatController.getConversations);
router.get('/conversations/:id', authenticate, chatController.getConversationById);
router.get('/conversations/:id/messages', authenticate, chatController.getMessages);
router.post('/conversations/:id/messages', authenticate, chatController.sendMessage);
router.put('/conversations/:id/read', authenticate, chatController.markAsRead);
router.get('/unread-count', authenticate, chatController.getUnreadCount);

export default router;
```

### 6. Registrar en app.ts

```typescript
import chatRoutes from './modules/chat/chat.routes';

app.use(`${APP_CONSTANTS.API_PREFIX}/chat`, chatRoutes);
```

---

## 🔌 INTEGRACIÓN COMPLETA CON SOCKET.IO

### 7. Implementar Handlers de Socket.IO

Crear `chat-socket.handler.ts`:

```typescript
import { SocketService } from '../../shared/realtime/socket.service';
import { ChatService } from './chat.service';

const chatService = new ChatService();

/**
 * Registrar handlers de Socket.IO para chat
 * 
 * Este handler se encarga de:
 * - Enviar mensajes en tiempo real
 * - Indicadores de escritura (typing)
 * - Estado de entrega/lectura
 * - Unirse automáticamente a rooms de conversación
 */
export function registerChatHandlers(socketService: SocketService) {
  const io = socketService.getIO();
  if (!io) return;

  io.on('connection', (socket) => {
    const userId = (socket as any).userId;

    // Unirse a rooms de conversaciones cuando se conecta
    // TODO: Obtener conversaciones del usuario y unirse a sus rooms
    // const conversations = await chatService.getConversations(userId);
    // conversations.forEach(conv => {
    //   socketService.joinRoom(userId, `conversation:${conv.id}`);
    // });

    // Handler: Enviar mensaje
    socket.on('chat:send-message', async (data: { conversationId: string, content: string, messageType?: string, fileUrl?: string }) => {
      try {
        // Crear mensaje en BD
        const message = await chatService.sendMessage(data.conversationId, userId, {
          content: data.content,
          messageType: data.messageType || 'text',
          fileUrl: data.fileUrl,
        });

        // Emitir mensaje a todos los participantes de la conversación
        socketService.emitToRoom(`conversation:${data.conversationId}`, {
          type: 'message',
          payload: {
            message: {
              id: message.id,
              conversationId: message.conversationId,
              userId: message.userId,
              content: message.content,
              messageType: message.messageType,
              fileUrl: message.fileUrl,
              isRead: message.isRead,
              createdAt: message.createdAt,
              user: message.user,
            },
          },
          timestamp: new Date().toISOString(),
        });

        // Actualizar lastMessageAt de la conversación
        await chatService.updateConversationLastMessage(data.conversationId);
      } catch (error) {
        console.error('Error enviando mensaje:', error);
        socket.emit('error', { message: 'Error al enviar mensaje' });
      }
    });

    // Handler: Indicador de escritura (typing)
    socket.on('chat:typing', async (data: { conversationId: string, isTyping: boolean }) => {
      // Emitir a todos los participantes excepto al que está escribiendo
      socket.to(`conversation:${data.conversationId}`).emit('event', {
        type: 'typing',
        payload: {
          conversationId: data.conversationId,
          userId: userId,
          isTyping: data.isTyping,
        },
        timestamp: new Date().toISOString(),
      });
    });

    // Handler: Marcar como leído
    socket.on('chat:mark-read', async (data: { conversationId: string }) => {
      try {
        await chatService.markAsRead(data.conversationId, userId);

        // Notificar a otros participantes que el mensaje fue leído
        socketService.emitToRoom(`conversation:${data.conversationId}`, {
          type: 'message_read',
          payload: {
            conversationId: data.conversationId,
            userId: userId,
            readAt: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error marcando como leído:', error);
      }
    });

    // Handler: Unirse a conversación (room)
    socket.on('chat:join-conversation', async (data: { conversationId: string }) => {
      socketService.joinRoom(userId, `conversation:${data.conversationId}`);
      socket.emit('event', {
        type: 'conversation_joined',
        payload: { conversationId: data.conversationId },
        timestamp: new Date().toISOString(),
      });
    });

    // Handler: Salir de conversación (room)
    socket.on('chat:leave-conversation', async (data: { conversationId: string }) => {
      socketService.leaveRoom(userId, `conversation:${data.conversationId}`);
    });
  });
}
```

### 8. Registrar Handler en socket.service.ts

En `src/shared/realtime/socket.service.ts`, en el método `setupConnectionHandlers()`:

```typescript
import { registerChatHandlers } from '../../modules/chat/chat-socket.handler';

// Dentro de setupConnectionHandlers(), después de io.on('connection', ...)
registerChatHandlers(this);
```

---

## 📝 PROMPT COMPLETO PARA IMPLEMENTAR

### Prompt para Copiar y Pegar:

```
Necesito implementar el módulo de chat directo (1-a-1) con integración completa de Socket.IO.

Requisitos:
1. Crear migración Prisma para tablas: `conversations`, `conversation_participants`, `messages`
2. Crear DTOs en `src/shared/dto/chat.dto.ts`: ConversationDTO, MessageDTO, CreateConversationDTO, SendMessageDTO, etc.
3. Implementar ChatService con métodos:
   - createOrGetConversation(userId, participantId)
   - getConversations(userId)
   - getConversationById(conversationId, userId)
   - getMessages(conversationId, userId, pagination)
   - sendMessage(conversationId, userId, data)
   - markAsRead(conversationId, userId)
   - getUnreadCount(userId)
4. Implementar ChatController con endpoints:
   - POST /api/v1/chat/conversations
   - GET /api/v1/chat/conversations
   - GET /api/v1/chat/conversations/:id
   - GET /api/v1/chat/conversations/:id/messages
   - POST /api/v1/chat/conversations/:id/messages
   - PUT /api/v1/chat/conversations/:id/read
   - GET /api/v1/chat/unread-count
5. Crear routes y registrar en app.ts
6. Crear chat-socket.handler.ts con handlers para:
   - chat:send-message (enviar mensaje en tiempo real)
   - chat:typing (indicador de escritura)
   - chat:mark-read (marcar como leído)
   - chat:join-conversation (unirse a room)
   - chat:leave-conversation (salir de room)
7. Registrar handler en socket.service.ts
8. Usar rooms: `conversation:${conversationId}` para cada conversación
9. Los mensajes se emiten a la room de la conversación para que todos los participantes los reciban

IMPORTANTE: Solo chat directo (1-a-1), NO chat grupal.
```

---

## 🔌 Integración con Realtime

### Rooms de Conversación

Cada conversación tiene su propia room: `conversation:${conversationId}`

- Cuando un usuario envía un mensaje, se emite a la room
- Todos los participantes reciben el mensaje en tiempo real
- Los indicadores de escritura se emiten a la room (excepto al que escribe)

### Eventos Socket.IO

**Cliente → Servidor**:
- `chat:send-message` - Enviar mensaje
- `chat:typing` - Indicador de escritura
- `chat:mark-read` - Marcar como leído
- `chat:join-conversation` - Unirse a room
- `chat:leave-conversation` - Salir de room

**Servidor → Cliente**:
- `event` con `type: 'message'` - Nuevo mensaje
- `event` con `type: 'typing'` - Indicador de escritura
- `event` con `type: 'message_read'` - Mensaje leído
- `event` con `type: 'conversation_joined'` - Unido a conversación

---

## 📝 Notas

- Las conversaciones directas solo tienen 2 participantes
- Los mensajes se ordenan por `createdAt` descendente
- El `lastMessageAt` se actualiza cuando se envía un mensaje
- Los indicadores de escritura tienen timeout (ej: 3 segundos)
- **NO hay chat grupal** - solo conversaciones 1-a-1

---

**Última actualización**: 2025-01-22  
**Estado**: Estructura preparada, implementación pendiente

