# Migración al Nuevo Servicio de Chat

## ¿Por qué migrar?

El nuevo `ChatService` resuelve los problemas del sistema anterior:

1. ✅ **Estado único y persistente** - No más desincronización entre hooks
2. ✅ **Reconexión automática** - Re-suscribe a conversaciones activas
3. ✅ **Queue de mensajes** - Guarda mensajes durante desconexión
4. ✅ **Tiempo real garantizado** - Socket como fuente principal
5. ✅ **Mejor rendimiento** - Singleton, no múltiples instancias

## Uso Básico

### Opción 1: Usar el hook `useChatService` (Recomendado)

```typescript
import { useChatService } from '@/lib/hooks/use-chat-service'

function MyChatComponent() {
  const {
    isConnected,
    messages,
    joinConversation,
    sendMessage,
    markAsRead,
    getMessages,
    getTypingUsers,
  } = useChatService()

  // Unirse a conversación
  useEffect(() => {
    if (conversationId && isConnected) {
      joinConversation(conversationId)
    }
  }, [conversationId, isConnected, joinConversation])

  // Obtener mensajes
  const conversationMessages = getMessages(conversationId)

  // Enviar mensaje
  const handleSend = () => {
    sendMessage(conversationId, messageText)
  }
}
```

### Opción 2: Usar el servicio directamente

```typescript
import { chatService } from '@/lib/services/chat.service'

// Inicializar (se hace automáticamente con useChatService)
chatService.initialize(userId, token)

// Suscribirse a eventos
const unsubscribe = chatService.on('message:new', ({ message }) => {
  console.log('Nuevo mensaje:', message)
})

// Unirse a conversación
chatService.joinConversation(conversationId)

// Enviar mensaje
const tempId = chatService.sendMessage(conversationId, content)

// Obtener mensajes
const messages = chatService.getMessages(conversationId)
```

## Migración de Componentes

### Antes (useSocket + useChat)

```typescript
const { socket, isConnected, sendMessage: sendSocketMessage } = useSocket()
const { getMessages, fetchMessages } = useChat()

// Problemas:
// - Estado fragmentado
// - No hay queue de mensajes
// - Reconexión manual
```

### Después (useChatService)

```typescript
const {
  isConnected,
  sendMessage,
  getMessages,
  loadMessages,
  joinConversation,
} = useChatService()

// Ventajas:
// - Estado unificado
// - Queue automático
// - Reconexión automática
```

## Eventos Disponibles

```typescript
chatService.on('connected', () => {})
chatService.on('disconnected', ({ reason }) => {})
chatService.on('message:new', ({ message }) => {})
chatService.on('message:sent', ({ message, tempId }) => {})
chatService.on('message:error', ({ error, tempId }) => {})
chatService.on('typing:start', ({ conversationId, userId }) => {})
chatService.on('typing:stop', ({ conversationId, userId }) => {})
chatService.on('read:update', ({ conversationId, readBy }) => {})
chatService.on('conversation:joined', ({ conversationId }) => {})
chatService.on('conversation:left', ({ conversationId }) => {})
```

## Características Clave

### 1. Queue de Mensajes
Los mensajes se guardan automáticamente si el socket está desconectado y se envían al reconectar.

### 2. Reconexión Automática
Al reconectar, el servicio:
- Re-suscribe a todas las conversaciones activas
- Envía mensajes pendientes
- Sincroniza estado con el servidor

### 3. Estado Persistente
El estado se mantiene entre componentes y re-renders.

### 4. Optimistic Updates
Los mensajes se muestran inmediatamente y se reemplazan con el ACK del servidor.



