# Configuración de Socket.IO para Medusa v2

## Dependencias Requeridas

Antes de usar el módulo de Socket.IO, instala las siguientes dependencias:

```bash
npm install socket.io @types/socket.io
```

## Estructura del Módulo

El módulo de Socket.IO ha sido configurado con la siguiente estructura:

```
src/modules/socket/
├── index.ts                    # Definición del módulo
├── service.ts                  # Servicio principal de Socket.IO
└── loaders/
    └── socket-server.ts        # Loader para inicializar el servidor
```

## Características Implementadas

### 1. **SocketModuleService**
- Inicialización del servidor Socket.IO
- Configuración automática de CORS
- Manejo de eventos básicos (conexión, autenticación, salas)
- Métodos para emitir eventos a usuarios y conversaciones específicas

### 2. **Eventos Soportados**
- `authenticate`: Autenticación de usuarios
- `join-conversation`: Unirse a una conversación
- `leave-conversation`: Salir de una conversación
- `typing-start/typing-stop`: Indicadores de escritura
- `disconnect`: Manejo de desconexiones

### 3. **Salas (Rooms)**
- `user_{customerId}`: Sala individual por usuario
- `conversation_{conversationId}`: Sala por conversación

### 4. **Métodos del Servicio**
- `emitToUser(customerId, event, data)`: Enviar evento a usuario específico
- `emitToConversation(conversationId, event, data)`: Enviar evento a conversación
- `emitToAll(event, data)`: Enviar evento a todos los clientes
- `getConnectionInfo()`: Obtener información de conexiones activas

## Configuración de CORS

El módulo utiliza automáticamente la configuración de CORS de Medusa desde `projectConfig.http.storeCors`.

## Endpoint de Estado

Se ha creado un endpoint para verificar el estado del servidor Socket.IO:

```
GET /socket/status
```

Respuesta de ejemplo:
```json
{
  "success": true,
  "data": {
    "socketServerInitialized": true,
    "connectionInfo": {
      "connectedClients": 5,
      "rooms": [],
      "userRooms": ["user_123", "user_456"],
      "conversationRooms": ["conversation_789"]
    },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "message": "Socket.IO server is running successfully"
  }
}
```

## Uso en el Frontend

Para conectar desde el frontend (Next.js), puedes usar:

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:9000', {
  transports: ['websocket', 'polling'],
  withCredentials: true,
});

// Autenticación
socket.emit('authenticate', { customerId: 'user123' });

// Escuchar eventos
socket.on('authenticated', (data) => {
  console.log('Authenticated successfully:', data);
});

socket.on('new-message', (message) => {
  console.log('New message received:', message);
});
```

## Integración con Workflows

El servicio puede ser usado en workflows para emitir eventos en tiempo real:

```typescript
// En un workflow step
const socketService = container.resolve("socketModuleService");

// Emitir nuevo mensaje a una conversación
socketService.emitToConversation(conversationId, "new-message", {
  messageId: message.id,
  content: message.content,
  senderId: message.sender_id,
  timestamp: message.created_at,
});
```

## Variables de Entorno

Asegúrate de tener configuradas las siguientes variables en tu `.env`:

```env
STORE_CORS=http://localhost:3000,http://localhost:3001
```

## Inicio del Servidor

El servidor Socket.IO se inicializa automáticamente cuando arranca Medusa. Verifica los logs para confirmar:

```
[SOCKET LOADER] Socket.IO server successfully attached to HTTP server
[SOCKET LOADER] CORS origins configured: ["http://localhost:3000"]
[SOCKET MODULE] Socket.IO server initialized successfully
```

## Troubleshooting

1. **Error de CORS**: Verifica que `STORE_CORS` incluya el dominio del frontend
2. **Puerto ocupado**: Socket.IO usa el mismo puerto que Medusa (9000 por defecto)
3. **Conexión fallida**: Verifica que el endpoint `/socket/status` retorne `socketServerInitialized: true`
