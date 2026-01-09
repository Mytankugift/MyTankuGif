# 👥 MÓDULO GROUPS (Grupos de Amigos)

## 📋 Estado

**⚠️ MÓDULO PREPARADO - NO IMPLEMENTADO**

Este módulo está preparado para implementar grupos de amigos. **NO incluye chat grupal**, solo gestión de grupos y miembros.

---

## 🎯 Funcionalidad Planificada

- Crear grupos de amigos
- Invitar amigos a grupos
- Gestionar miembros (agregar, eliminar, cambiar rol)
- Listar grupos del usuario
- Ver miembros de un grupo
- Integración con realtime (notificaciones de grupo)

**⚠️ IMPORTANTE**: Este módulo NO incluye chat grupal. Los grupos son solo para organizar amigos.

---

## 📐 Tablas Prisma Requeridas

### Migración a Crear

```prisma
model Group {
  id          String        @id @default(cuid())
  name        String
  description String?
  ownerId     String        @map("owner_id")
  isPublic    Boolean       @default(false) @map("is_public")
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")
  
  owner       User          @relation("GroupOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  members     GroupMember[]
  
  @@index([ownerId])
  @@map("groups")
}

model GroupMember {
  id        String   @id @default(cuid())
  groupId   String   @map("group_id")
  userId    String   @map("user_id")
  role      String   // 'owner' | 'admin' | 'member'
  joinedAt  DateTime @default(now()) @map("joined_at")
  
  group     Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user      User     @relation("GroupMember", fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([groupId, userId])
  @@index([userId])
  @@index([groupId])
  @@map("group_members")
}
```

### Actualizar Modelo User

```prisma
model User {
  // ... campos existentes ...
  
  ownedGroups  Group        @relation("GroupOwner")
  groupMembers GroupMember[] @relation("GroupMember")
}
```

---

## 🛠️ Pasos para Implementar

### 1. Crear Migración Prisma

```bash
cd tanku-backend
npx prisma migrate dev --name add_groups_tables
```

### 2. Crear DTOs

Crear `src/shared/dto/groups.dto.ts`:

```typescript
export interface GroupDTO {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  isPublic: boolean;
  memberCount: number;
  owner: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profile: {
      avatar: string | null;
    } | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface GroupMemberDTO {
  id: string;
  groupId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
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

export interface CreateGroupDTO {
  name: string;
  description?: string;
  isPublic?: boolean;
}

export interface UpdateGroupDTO {
  name?: string;
  description?: string;
  isPublic?: boolean;
}

export interface AddGroupMemberDTO {
  userId: string;
  role?: 'admin' | 'member';
}
```

### 3. Implementar Service

En `groups.service.ts`:

- `createGroup(userId, data)`
- `getGroups(userId)` - grupos del usuario
- `getGroupById(groupId, userId)` - obtener grupo (verificar membresía)
- `updateGroup(groupId, userId, data)` - actualizar (solo owner/admin)
- `deleteGroup(groupId, userId)` - eliminar (solo owner)
- `getGroupMembers(groupId, userId)` - listar miembros
- `addGroupMember(groupId, userId, memberId, role)` - agregar miembro
- `removeGroupMember(groupId, userId, memberId)` - eliminar miembro
- `updateMemberRole(groupId, userId, memberId, role)` - cambiar rol

### 4. Implementar Controller

En `groups.controller.ts`:

- `POST /api/v1/groups` - crear grupo
- `GET /api/v1/groups` - listar grupos del usuario
- `GET /api/v1/groups/:id` - obtener grupo
- `PUT /api/v1/groups/:id` - actualizar grupo
- `DELETE /api/v1/groups/:id` - eliminar grupo
- `GET /api/v1/groups/:id/members` - listar miembros
- `POST /api/v1/groups/:id/members` - agregar miembro
- `DELETE /api/v1/groups/:id/members/:memberId` - eliminar miembro
- `PUT /api/v1/groups/:id/members/:memberId/role` - cambiar rol

### 5. Crear Routes

En `groups.routes.ts`:

```typescript
import { Router } from 'express';
import { GroupsController } from './groups.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();
const groupsController = new GroupsController();

router.post('/', authenticate, groupsController.createGroup);
router.get('/', authenticate, groupsController.getGroups);
router.get('/:id', authenticate, groupsController.getGroupById);
router.put('/:id', authenticate, groupsController.updateGroup);
router.delete('/:id', authenticate, groupsController.deleteGroup);
router.get('/:id/members', authenticate, groupsController.getGroupMembers);
router.post('/:id/members', authenticate, groupsController.addGroupMember);
router.delete('/:id/members/:memberId', authenticate, groupsController.removeGroupMember);
router.put('/:id/members/:memberId/role', authenticate, groupsController.updateMemberRole);

export default router;
```

### 6. Registrar en app.ts

```typescript
import groupsRoutes from './modules/groups/groups.routes';

app.use(`${APP_CONSTANTS.API_PREFIX}/groups`, groupsRoutes);
```

### 7. Implementar Handlers de Socket.IO

Crear `groups-socket.handler.ts`:

```typescript
import { SocketService } from '../../shared/realtime/socket.service';

export function registerGroupsHandlers(socketService: SocketService) {
  const io = socketService.getIO();
  if (!io) return;

  io.on('connection', (socket) => {
    const userId = (socket as any).userId;

    // Unirse a rooms de grupos cuando se conecta
    // TODO: Obtener grupos del usuario y unirse a sus rooms
    // socketService.joinRoom(userId, `group:${groupId}`);

    // Notificar cuando se agrega miembro
    socket.on('groups:member-added', async (data: { groupId: string, memberId: string }) => {
      // Emitir notificación al nuevo miembro
      socketService.emitToUser(data.memberId, {
        type: 'notification',
        payload: {
          type: 'group_member_added',
          groupId: data.groupId,
          fromUserId: userId,
          message: 'Has sido agregado a un grupo',
        },
      });

      // Unir al nuevo miembro a la room del grupo
      socketService.joinRoom(data.memberId, `group:${data.groupId}`);
    });

    // Notificar cuando se elimina miembro
    socket.on('groups:member-removed', async (data: { groupId: string, memberId: string }) => {
      socketService.emitToUser(data.memberId, {
        type: 'notification',
        payload: {
          type: 'group_member_removed',
          groupId: data.groupId,
          fromUserId: userId,
          message: 'Has sido eliminado de un grupo',
        },
      });

      // Sacar del miembro de la room del grupo
      socketService.leaveRoom(data.memberId, `group:${data.groupId}`);
    });
  });
}
```

### 8. Registrar Handler en socket.service.ts

En `src/shared/realtime/socket.service.ts`, en el método `setupConnectionHandlers()`:

```typescript
import { registerGroupsHandlers } from '../../modules/groups/groups-socket.handler';

// Dentro de setupConnectionHandlers(), después de io.on('connection', ...)
registerGroupsHandlers(this);
```

---

## 🔌 Integración con Realtime

### Rooms de Grupo

Cada grupo tiene su propia room: `group:${groupId}`

- Cuando un usuario se une a un grupo, se une automáticamente a la room
- Cuando se elimina de un grupo, sale de la room
- Las notificaciones de grupo se envían a la room

### Eventos a Emitir

1. **Miembro agregado**:
   ```typescript
   socketService.emitToUser(memberId, {
     type: 'notification',
     payload: {
       type: 'group_member_added',
       groupId: groupId,
       fromUserId: userId,
       message: 'Has sido agregado a un grupo',
     },
   });
   ```

2. **Miembro eliminado**:
   ```typescript
   socketService.emitToUser(memberId, {
     type: 'notification',
     payload: {
       type: 'group_member_removed',
       groupId: groupId,
       fromUserId: userId,
       message: 'Has sido eliminado de un grupo',
     },
   });
   ```

---

## 📝 Notas

- Los grupos son privados por defecto (`isPublic: false`)
- Solo el owner puede eliminar el grupo
- Los admins pueden agregar/eliminar miembros (excepto owner)
- Los miembros regulares solo pueden ver el grupo
- **NO hay chat grupal** - los grupos son solo para organizar amigos

---

**Última actualización**: 2025-01-22  
**Estado**: Estructura preparada, implementación pendiente

