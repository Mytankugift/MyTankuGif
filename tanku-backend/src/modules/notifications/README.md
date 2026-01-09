# 🔔 MÓDULO NOTIFICATIONS (Notificaciones)

## 📋 Estado

**⚠️ MÓDULO PREPARADO - NO IMPLEMENTADO**

Este módulo está preparado para implementar el sistema de notificaciones con integración completa de Socket.IO.

---

## 🎯 Funcionalidad Planificada

- Crear notificaciones (desde otros módulos)
- Listar notificaciones del usuario
- Marcar como leída/no leída
- Contador de no leídas
- Eliminar notificaciones
- Integración completa con Socket.IO para notificaciones en tiempo real

---

## 📐 Tablas Prisma Requeridas

### Migración a Crear

```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  type      String   // 'like' | 'comment' | 'friend_request' | 'friend_accepted' | 'order_update' | 'group_member_added' | etc.
  title     String
  message   String
  data      Json?    // Datos adicionales: { postId, orderId, groupId, etc. }
  isRead    Boolean  @default(false) @map("is_read")
  createdAt DateTime  @default(now()) @map("created_at")
  readAt    DateTime? @map("read_at")
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, isRead])
  @@index([userId, createdAt])
  @@map("notifications")
}
```

### Actualizar Modelo User

```prisma
model User {
  // ... campos existentes ...
  
  notifications Notification[]
}
```

---

## 🛠️ Pasos para Implementar

### 1. Crear Migración Prisma

```bash
cd tanku-backend
npx prisma migrate dev --name add_notifications_table
```

### 2. Crear DTOs

Crear `src/shared/dto/notifications.dto.ts`:

```typescript
export interface NotificationDTO {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationCountDTO {
  unreadCount: number;
  totalCount: number;
}

export interface CreateNotificationDTO {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
}
```

### 3. Implementar Service

En `notifications.service.ts`:

- `createNotification(data)` - crear notificación
- `getNotifications(userId, filters)` - listar notificaciones
- `getUnreadCount(userId)` - contador de no leídas
- `markAsRead(notificationId, userId)` - marcar como leída
- `markAllAsRead(userId)` - marcar todas como leídas
- `deleteNotification(notificationId, userId)` - eliminar

### 4. Implementar Controller

En `notifications.controller.ts`:

- `GET /api/v1/notifications` - listar notificaciones
- `GET /api/v1/notifications/unread-count` - contador de no leídas
- `PUT /api/v1/notifications/:id/read` - marcar como leída
- `PUT /api/v1/notifications/read-all` - marcar todas como leídas
- `DELETE /api/v1/notifications/:id` - eliminar

### 5. Crear Routes

En `notifications.routes.ts`:

```typescript
import { Router } from 'express';
import { NotificationsController } from './notifications.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();
const notificationsController = new NotificationsController();

router.get('/', authenticate, notificationsController.getNotifications);
router.get('/unread-count', authenticate, notificationsController.getUnreadCount);
router.put('/:id/read', authenticate, notificationsController.markAsRead);
router.put('/read-all', authenticate, notificationsController.markAllAsRead);
router.delete('/:id', authenticate, notificationsController.deleteNotification);

export default router;
```

### 6. Registrar en app.ts

```typescript
import notificationsRoutes from './modules/notifications/notifications.routes';

app.use(`${APP_CONSTANTS.API_PREFIX}/notifications`, notificationsRoutes);
```

---

## 🔌 INTEGRACIÓN COMPLETA CON SOCKET.IO

### 7. Implementar Handlers de Socket.IO

Crear `notifications-socket.handler.ts`:

```typescript
import { SocketService } from '../../shared/realtime/socket.service';
import { NotificationsService } from './notifications.service';

const notificationsService = new NotificationsService();

/**
 * Registrar handlers de Socket.IO para notificaciones
 * 
 * Este handler se encarga de:
 * - Emitir notificaciones en tiempo real cuando se crean
 * - Actualizar contador de no leídas en tiempo real
 * - Notificar cuando se marca como leída
 */
export function registerNotificationsHandlers(socketService: SocketService) {
  const io = socketService.getIO();
  if (!io) return;

  io.on('connection', (socket) => {
    const userId = (socket as any).userId;

    // El usuario ya está en la room `user:${userId}` (configurado en socket.service.ts)
    // Las notificaciones se emiten automáticamente a esta room
  });

  // Función helper para emitir notificación en tiempo real
  // Esta función debe ser llamada desde notifications.service.ts cuando se crea una notificación
  socketService.emitNotification = async (userId: string, notification: any) => {
    // Emitir notificación al usuario
    socketService.emitToUser(userId, {
      type: 'notification',
      payload: {
        notification: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
        },
      },
      timestamp: new Date().toISOString(),
    });

    // Actualizar contador de no leídas
    const unreadCount = await notificationsService.getUnreadCount(userId);
    socketService.emitToUser(userId, {
      type: 'notification_count',
      payload: {
        unreadCount: unreadCount,
      },
      timestamp: new Date().toISOString(),
    });
  };
}
```

### 8. Registrar Handler en socket.service.ts

En `src/shared/realtime/socket.service.ts`:

**Paso 1**: Agregar método helper en la clase:

```typescript
export class SocketService {
  // ... código existente ...

  /**
   * Emitir notificación en tiempo real
   * Helper para el módulo de notificaciones
   */
  async emitNotification(userId: string, notification: any) {
    // Emitir notificación
    this.emitToUser(userId, {
      type: 'notification',
      payload: {
        notification: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
        },
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emitir contador de notificaciones no leídas
   */
  async emitNotificationCount(userId: string, unreadCount: number) {
    this.emitToUser(userId, {
      type: 'notification_count',
      payload: {
        unreadCount: unreadCount,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
```

**Paso 2**: Importar y registrar handler en `setupConnectionHandlers()`:

```typescript
import { registerNotificationsHandlers } from '../../modules/notifications/notifications-socket.handler';

// Dentro de setupConnectionHandlers(), después de io.on('connection', ...)
registerNotificationsHandlers(this);
```

### 9. Usar Socket.IO desde NotificationsService

En `notifications.service.ts`, cuando se crea una notificación:

```typescript
import { getSocketService } from '../../shared/realtime/socket.service';

export class NotificationsService {
  async createNotification(data: CreateNotificationDTO) {
    // Crear notificación en BD
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || null,
      },
    });

    // Emitir en tiempo real si el usuario está conectado
    const socketService = getSocketService();
    if (socketService.isUserConnected(data.userId)) {
      await socketService.emitNotification(data.userId, notification);
    }

    return notification;
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.update({
      where: { id: notificationId, userId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    // Actualizar contador en tiempo real
    const socketService = getSocketService();
    if (socketService.isUserConnected(userId)) {
      const unreadCount = await this.getUnreadCount(userId);
      await socketService.emitNotificationCount(userId, unreadCount);
    }

    return notification;
  }
}
```

---

## 📝 PROMPT COMPLETO PARA IMPLEMENTAR

### Prompt para Copiar y Pegar:

```
Necesito implementar el módulo de notificaciones con integración completa de Socket.IO.

Requisitos:
1. Crear migración Prisma para tabla `notifications` con campos: id, userId, type, title, message, data (Json), isRead, createdAt, readAt
2. Crear DTOs en `src/shared/dto/notifications.dto.ts`: NotificationDTO, NotificationCountDTO, CreateNotificationDTO
3. Implementar NotificationsService con métodos:
   - createNotification(data)
   - getNotifications(userId, filters)
   - getUnreadCount(userId)
   - markAsRead(notificationId, userId)
   - markAllAsRead(userId)
   - deleteNotification(notificationId, userId)
4. Implementar NotificationsController con endpoints:
   - GET /api/v1/notifications
   - GET /api/v1/notifications/unread-count
   - PUT /api/v1/notifications/:id/read
   - PUT /api/v1/notifications/read-all
   - DELETE /api/v1/notifications/:id
5. Crear routes y registrar en app.ts
6. Agregar métodos helper en SocketService: emitNotification() y emitNotificationCount()
7. Crear notifications-socket.handler.ts que registre handlers (aunque el handler principal es automático via rooms)
8. Registrar handler en socket.service.ts
9. Integrar emisión de notificaciones en tiempo real desde NotificationsService cuando se crean/marcan como leídas

El usuario ya está en la room `user:${userId}` automáticamente, así que las notificaciones se emiten a esa room.
```

---

## 🔄 Uso desde Otros Módulos

### Ejemplo: Crear notificación desde módulo de Friends

```typescript
import { NotificationsService } from '../notifications/notifications.service';

const notificationsService = new NotificationsService();

// Cuando se envía solicitud de amistad
await notificationsService.createNotification({
  userId: friendId,
  type: 'friend_request',
  title: 'Nueva solicitud de amistad',
  message: `${user.firstName} te envió una solicitud de amistad`,
  data: { fromUserId: userId },
});
```

---

## 📝 Notas

- Las notificaciones se emiten automáticamente en tiempo real si el usuario está conectado
- El contador de no leídas se actualiza en tiempo real
- Las notificaciones pueden tener `data` adicional (Json) para información extra
- Los tipos de notificación son flexibles: 'like', 'comment', 'friend_request', etc.

---

**Última actualización**: 2025-01-22  
**Estado**: Estructura preparada, implementación pendiente

