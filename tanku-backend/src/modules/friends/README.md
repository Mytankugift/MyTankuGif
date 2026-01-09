# 👥 MÓDULO FRIENDS (Amigos)

## 📋 Estado

**⚠️ MÓDULO PREPARADO - NO IMPLEMENTADO**

Este módulo está preparado para implementar la funcionalidad de amigos. Actualmente solo contiene la estructura base.

---

## 🎯 Funcionalidad Planificada

- Enviar solicitudes de amistad
- Aceptar/rechazar solicitudes
- Listar amigos
- Eliminar amigo
- Sugerencias de amigos
- Integración con realtime (notificaciones de solicitudes, presencia)

---

## 📐 Tablas Prisma Requeridas

### Migración a Crear

```prisma
model Friend {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  friendId    String   @map("friend_id")
  status      String   // 'pending' | 'accepted' | 'blocked'
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  user        User     @relation("UserFriends", fields: [userId], references: [id], onDelete: Cascade)
  friend      User     @relation("FriendOf", fields: [friendId], references: [id], onDelete: Cascade)
  
  @@unique([userId, friendId])
  @@index([userId, status])
  @@index([friendId, status])
  @@map("friends")
}
```

### Actualizar Modelo User

```prisma
model User {
  // ... campos existentes ...
  
  friends     Friend[] @relation("UserFriends")
  friendOf    Friend[] @relation("FriendOf")
}
```

---

## 🛠️ Pasos para Implementar

### 1. Crear Migración Prisma

```bash
cd tanku-backend
npx prisma migrate dev --name add_friends_table
```

### 2. Crear DTOs

Crear `src/shared/dto/friends.dto.ts`:

```typescript
export interface FriendDTO {
  id: string;
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted' | 'blocked';
  friend: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profile: {
      avatar: string | null;
      banner: string | null;
      bio: string | null;
    } | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface FriendRequestDTO {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  fromUser: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profile: {
      avatar: string | null;
    } | null;
  };
  createdAt: string;
}

export interface CreateFriendRequestDTO {
  friendId: string;
}

export interface UpdateFriendRequestDTO {
  status: 'accepted' | 'rejected';
}
```

### 3. Implementar Service

En `friends.service.ts`:

- `sendFriendRequest(userId, friendId)`
- `getFriendRequests(userId)` - solicitudes recibidas
- `getSentFriendRequests(userId)` - solicitudes enviadas
- `updateFriendRequest(requestId, status)` - aceptar/rechazar
- `getFriends(userId)` - listar amigos aceptados
- `removeFriend(userId, friendId)` - eliminar amigo
- `getFriendSuggestions(userId)` - sugerencias

### 4. Implementar Controller

En `friends.controller.ts`:

- `POST /api/v1/friends/requests` - enviar solicitud
- `GET /api/v1/friends/requests` - listar recibidas
- `GET /api/v1/friends/requests/sent` - listar enviadas
- `PUT /api/v1/friends/requests/:id` - aceptar/rechazar
- `GET /api/v1/friends` - listar amigos
- `DELETE /api/v1/friends/:friendId` - eliminar amigo
- `GET /api/v1/friends/suggestions` - sugerencias

### 5. Crear Routes

En `friends.routes.ts`:

```typescript
import { Router } from 'express';
import { FriendsController } from './friends.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();
const friendsController = new FriendsController();

router.post('/requests', authenticate, friendsController.sendFriendRequest);
router.get('/requests', authenticate, friendsController.getFriendRequests);
router.get('/requests/sent', authenticate, friendsController.getSentFriendRequests);
router.put('/requests/:id', authenticate, friendsController.updateFriendRequest);
router.get('/', authenticate, friendsController.getFriends);
router.delete('/:friendId', authenticate, friendsController.removeFriend);
router.get('/suggestions', authenticate, friendsController.getFriendSuggestions);

export default router;
```

### 6. Registrar en app.ts

```typescript
import friendsRoutes from './modules/friends/friends.routes';

app.use(`${APP_CONSTANTS.API_PREFIX}/friends`, friendsRoutes);
```

### 7. Implementar Handlers de Socket.IO

Crear `friends-socket.handler.ts`:

```typescript
import { SocketService } from '../../shared/realtime/socket.service';

export function registerFriendsHandlers(socketService: SocketService) {
  const io = socketService.getIO();
  if (!io) return;

  io.on('connection', (socket) => {
    const userId = (socket as any).userId;

    // Notificar cuando se envía solicitud
    socket.on('friends:request-sent', async (data: { friendId: string }) => {
      // Emitir notificación al destinatario
      socketService.emitToUser(data.friendId, {
        type: 'notification',
        payload: {
          type: 'friend_request',
          fromUserId: userId,
          message: 'Nueva solicitud de amistad',
        },
      });
    });

    // Notificar cuando se acepta solicitud
    socket.on('friends:request-accepted', async (data: { friendId: string }) => {
      socketService.emitToUser(data.friendId, {
        type: 'notification',
        payload: {
          type: 'friend_accepted',
          fromUserId: userId,
          message: 'Solicitud de amistad aceptada',
        },
      });
    });
  });
}
```

### 8. Registrar Handler en socket.service.ts

En `src/shared/realtime/socket.service.ts`, en el método `setupConnectionHandlers()`:

```typescript
import { registerFriendsHandlers } from '../../modules/friends/friends-socket.handler';

// Dentro de setupConnectionHandlers(), después de io.on('connection', ...)
registerFriendsHandlers(this);
```

---

## 🔌 Integración con Realtime

### Eventos a Emitir

1. **Solicitud de amistad enviada**:
   ```typescript
   socketService.emitToUser(friendId, {
     type: 'notification',
     payload: {
       type: 'friend_request',
       fromUserId: userId,
       message: 'Nueva solicitud de amistad',
     },
   });
   ```

2. **Solicitud aceptada**:
   ```typescript
   socketService.emitToUser(friendId, {
     type: 'notification',
     payload: {
       type: 'friend_accepted',
       fromUserId: userId,
       message: 'Solicitud de amistad aceptada',
     },
   });
   ```

3. **Presencia de amigos** (cuando se implemente):
   - Notificar cuando un amigo se conecta/desconecta
   - Usar rooms: `friends:${userId}`

---

## 📝 Notas

- Las solicitudes son bidireccionales (si A envía a B, B puede aceptar)
- El estado `blocked` permite bloquear usuarios
- Las sugerencias pueden basarse en:
  - Usuarios con intereses similares
  - Amigos de amigos
  - Usuarios que interactuaron con tus posts

---

**Última actualización**: 2025-01-22  
**Estado**: Estructura preparada, implementación pendiente

