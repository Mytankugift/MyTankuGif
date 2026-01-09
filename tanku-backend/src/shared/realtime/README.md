# 🔌 INFRAESTRUCTURA DE REALTIME

## 📋 Descripción

Esta carpeta contiene la infraestructura genérica de realtime usando Socket.IO. **NO contiene lógica de negocio** (amigos, chat, grupos). Está diseñada para ser extensible cuando se implementen esas features.

## 🎯 Principios de Diseño

1. **Genérico y Reutilizable**: Los eventos siguen el patrón `{ type, payload }`
2. **Sin Lógica de Negocio**: No conoce nada de amigos, chat o grupos
3. **Extensible**: Fácil agregar handlers para nuevas features
4. **Autenticado**: Todos los sockets requieren JWT válido

## 📁 Estructura

```
src/shared/realtime/
├── socket.types.ts      # Tipos genéricos para eventos
├── socket.service.ts    # Servicio principal de Socket.IO
└── README.md           # Esta documentación
```

## 🔌 Uso Básico

### Emitir evento a un usuario

```typescript
import { getSocketService } from './shared/realtime/socket.service';

const socketService = getSocketService();

// Emitir notificación
socketService.emitToUser(userId, {
  type: 'notification',
  payload: {
    title: 'Nueva notificación',
    message: 'Tienes un nuevo mensaje',
  },
});
```

### Emitir evento a múltiples usuarios

```typescript
socketService.emitToUsers([userId1, userId2], {
  type: 'notification',
  payload: { ... },
});
```

### Emitir evento a una room

```typescript
socketService.emitToRoom('room:chat:123', {
  type: 'message',
  payload: { ... },
});
```

## 🏗️ Arquitectura Futura

### Dominios Planificados (NO implementados aún)

#### 1. **Friends (Amigos)**
- **Tabla Prisma**: `friends` (pendiente crear)
- **Relación**: Bidireccional o unidireccional (a definir)
- **Estados**: pending, accepted, blocked
- **Uso en Realtime**: 
  - Notificar cuando un amigo se conecta/desconecta
  - Notificar solicitudes de amistad
  - Feed de posts de amigos

#### 2. **Groups (Grupos)**
- **Tabla Prisma**: `groups`, `group_members` (pendiente crear)
- **Uso en Realtime**:
  - Notificaciones de grupo
  - Chat de grupo
  - Eventos de grupo

#### 3. **Notifications (Notificaciones)**
- **Tabla Prisma**: `notifications` (pendiente crear)
- **Tipos**: like, comment, friend_request, order_update, etc.
- **Uso en Realtime**:
  - Enviar notificaciones en tiempo real
  - Marcar como leídas
  - Contador de no leídas

#### 4. **Chat (Mensajería)**
- **Tabla Prisma**: `conversations`, `messages` (pendiente crear)
- **Tipos**: direct, group
- **Uso en Realtime**:
  - Enviar mensajes
  - Indicadores de escritura
  - Estado de entrega/lectura
  - Presencia (online/offline)

## 🔄 Flujo de Eventos

```
Cliente → Socket.IO → Middleware (Auth) → Handler Genérico → Feature Handler (futuro)
```

### Ejemplo de Evento Genérico

```typescript
// Cliente envía
socket.emit('event', {
  type: 'message',
  payload: {
    conversationId: 'conv_123',
    content: 'Hola!',
  },
});

// Backend recibe (en handler genérico)
// → Feature handler de Chat procesa (cuando se implemente)
```

## 📝 Eventos Estándar

### Tipos de Evento Predefinidos

- `notification` - Notificaciones generales
- `message` - Mensajes (chat)
- `presence` - Estado de presencia (online/offline)
- `custom` - Eventos personalizados

### Estructura de Evento

```typescript
interface SocketEvent {
  type: string;           // Tipo de evento
  payload: any;            // Datos del evento
  timestamp?: string;      // Timestamp ISO
  userId?: string;         // ID del usuario (opcional, se agrega automáticamente)
}
```

## 🚀 Extensión Futura

Cuando se implemente una feature (ej: Chat):

1. **Crear handler específico** en el módulo correspondiente:
   ```typescript
   // src/modules/chat/chat-socket.handler.ts
   export function registerChatHandlers(socketService: SocketService) {
     // Registrar handlers específicos de chat
   }
   ```

2. **Registrar en socket.service.ts**:
   ```typescript
   import { registerChatHandlers } from '../../modules/chat/chat-socket.handler';
   
   // En setupConnectionHandlers()
   registerChatHandlers(this);
   ```

3. **Usar rooms para chat**:
   ```typescript
   // Unirse a room de conversación
   socketService.joinRoom(userId, `conversation:${conversationId}`);
   
   // Emitir mensaje a la conversación
   socketService.emitToRoom(`conversation:${conversationId}`, {
     type: 'message',
     payload: { ... },
   });
   ```

## ⚠️ Reglas Importantes

1. **NO** agregar lógica de amigos, chat o grupos en `socket.service.ts`
2. **SÍ** usar el patrón genérico `{ type, payload }` para todos los eventos
3. **SÍ** crear handlers específicos en módulos cuando se implementen features
4. **SÍ** usar rooms para agrupar usuarios (conversaciones, grupos, etc.)

## 🔐 Autenticación

Todos los sockets requieren autenticación JWT:

```typescript
// Cliente debe enviar token en handshake
const socket = io('http://localhost:9000', {
  auth: {
    token: 'jwt_token_here'
  }
});
```

El middleware valida el token y agrega `userId` al socket.

## 📚 Referencias

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Socket.IO Rooms](https://socket.io/docs/v4/rooms/)
- [Socket.IO Authentication](https://socket.io/docs/v4/middlewares/)

