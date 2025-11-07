# Stalker Gift Frontend - API Service

Documentacion completa del servicio API para Stalker Gift en el frontend.

---

## 📁 Ubicacion

`Tanku-storefront/src/lib/data/stalker-gift/index.ts`

---

## 🔧 Configuracion

### Variables de Entorno

```env
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
```

---

## 📦 Funciones Disponibles

### 1. Crear Stalker Gift

**Funcion:** `createStalkerGift(payload)`

Crea un nuevo regalo sorpresa.

**Parametros:**
```typescript
interface CreateStalkerGiftPayload {
  total_amount: number
  first_name: string
  phone: string
  email: string
  giver_alias: string
  recipient_name: string
  contact_methods: Array<{
    type: string
    value: string
  }>
  products: Array<{
    id: string
    title: string
    quantity: number
    price: number
  }>
  message?: string
  giver_id?: string
  payment_method?: string
  payment_status?: string
}
```

**Uso:**
```typescript
import { createStalkerGift } from "@/lib/data/stalker-gift"

const result = await createStalkerGift({
  total_amount: 150000,
  first_name: "Juan",
  phone: "3001234567",
  email: "juan@email.com",
  giver_alias: "Tu admirador secreto",
  recipient_name: "Maria Garcia",
  contact_methods: [
    { type: "whatsapp", value: "3009876543" },
    { type: "email", value: "maria@email.com" }
  ],
  products: [
    {
      id: "prod_123",
      title: "Rosas rojas",
      quantity: 12,
      price: 150000
    }
  ],
  message: "Feliz cumpleaños!",
  payment_method: "epayco",
  payment_status: "pending"
})

console.log(result.data.invitationUrl)
// http://localhost:8000/stalkergift/stalker_gift_xyz
```

**Response:**
```typescript
{
  success: true,
  data: {
    stalkerGift: {
      id: "stalker_gift_xyz",
      total_amount: 150000,
      alias: "Tu admirador secreto",
      recipient_name: "Maria Garcia",
      payment_status: "pending",
      created_at: "2025-01-22T10:00:00Z"
    },
    invitationUrl: "http://localhost:8000/stalkergift/stalker_gift_xyz",
    invitationText: "Tienes un regalo sorpresa esperandote!..."
  },
  message: "StalkerGift created successfully"
}
```

---

### 2. Obtener Stalker Gift

**Funcion:** `getStalkerGiftById(id)`

Obtiene los detalles de un regalo por ID.

**Uso:**
```typescript
import { getStalkerGiftById } from "@/lib/data/stalker-gift"

const result = await getStalkerGiftById("stalker_gift_xyz")
console.log(result.data)
```

---

### 3. Actualizar Estado de Pago

**Funcion:** `updatePaymentStatus(id, payload)`

Actualiza el estado de pago del regalo.

**Parametros:**
```typescript
interface UpdatePaymentStatusPayload {
  payment_status: "pending" | "success" | "failed" | "recibida"
  transaction_id?: string
}
```

**Uso:**
```typescript
import { updatePaymentStatus } from "@/lib/data/stalker-gift"

// Marcar como pagado exitosamente
await updatePaymentStatus("stalker_gift_xyz", {
  payment_status: "success",
  transaction_id: "txn_123456"
})

// Marcar como aceptado por el destinatario
await updatePaymentStatus("stalker_gift_xyz", {
  payment_status: "recibida"
})
```

---

### 4. Habilitar Chat

**Funcion:** `enableChat(id, payload)`

Habilita el chat anonimo entre remitente y destinatario.

**Requisito:** El regalo debe estar aceptado (`payment_status === "recibida"`)

**Uso:**
```typescript
import { enableChat } from "@/lib/data/stalker-gift"

const result = await enableChat("stalker_gift_xyz", {
  customer_id: "cus_recipient_789"
})

console.log(result.data.conversation)
// { id: "conv_abc", is_enabled: true, ... }
```

---

### 5. Enviar Mensaje

**Funcion:** `sendMessage(payload)`

Envia un mensaje en el chat del regalo.

**Parametros:**
```typescript
interface SendMessagePayload {
  conversation_id: string
  sender_id: string
  content: string
  message_type?: "text" | "image" | "file" | "audio"
  file_url?: string
  reply_to_id?: string
}
```

**Uso:**
```typescript
import { sendMessage } from "@/lib/data/stalker-gift"

const result = await sendMessage({
  conversation_id: "conv_abc",
  sender_id: "cus_giver_456",
  content: "Hola! Espero que te guste el regalo",
  message_type: "text"
})

console.log(result.data.message)
```

---

### 6. Obtener Mensajes

**Funcion:** `getMessages(conversationId, customerId, limit?, offset?)`

Obtiene los mensajes de una conversacion.

**Uso:**
```typescript
import { getMessages } from "@/lib/data/stalker-gift"

const result = await getMessages(
  "conv_abc",      // conversation_id
  "cus_giver_456", // customer_id
  50,              // limit (opcional)
  0                // offset (opcional)
)

console.log(result.data.messages)
// Array de mensajes con estados de lectura
```

---

## 🛠 Funciones Utilitarias

### 1. Formatear Precio

**Funcion:** `formatPrice(amount, currencyCode?)`

```typescript
import { formatPrice } from "@/lib/data/stalker-gift"

const formatted = formatPrice(150000, "COP")
console.log(formatted) // "$150.000"
```

---

### 2. Calcular Total

**Funcion:** `calculateTotal(products)`

```typescript
import { calculateTotal } from "@/lib/data/stalker-gift"

const total = calculateTotal([
  { price: 50000, quantity: 2 },
  { price: 30000, quantity: 1 }
])
console.log(total) // 130000
```

---

### 3. Generar Texto de Invitacion

**Funcion:** `generateInvitationText(recipientName, invitationUrl)`

```typescript
import { generateInvitationText } from "@/lib/data/stalker-gift"

const text = generateInvitationText(
  "Maria",
  "http://localhost:8000/stalkergift/xyz"
)
```

---

### 4. Copiar al Portapapeles

**Funcion:** `copyToClipboard(text)`

```typescript
import { copyToClipboard } from "@/lib/data/stalker-gift"

const success = await copyToClipboard("Texto a copiar")
if (success) {
  alert("Copiado!")
}
```

---

### 5. Compartir via Web Share API

**Funcion:** `shareViaWebShare(data)`

```typescript
import { shareViaWebShare } from "@/lib/data/stalker-gift"

const success = await shareViaWebShare({
  title: "Regalo Sorpresa",
  text: "Tienes un regalo esperandote!",
  url: "http://localhost:8000/stalkergift/xyz"
})
```

---

## 📊 Flujo Completo de Uso

### Ejemplo: Crear y Enviar Regalo

```typescript
import {
  createStalkerGift,
  updatePaymentStatus,
  enableChat,
  sendMessage,
  formatPrice
} from "@/lib/data/stalker-gift"

// 1. Crear regalo
const gift = await createStalkerGift({
  total_amount: 150000,
  first_name: "Juan",
  phone: "3001234567",
  email: "juan@email.com",
  giver_alias: "Tu admirador",
  recipient_name: "Maria",
  contact_methods: [
    { type: "whatsapp", value: "3009876543" }
  ],
  products: [
    { id: "prod_1", title: "Rosas", quantity: 12, price: 150000 }
  ],
  message: "Feliz cumpleaños!"
})

console.log("URL de invitacion:", gift.data.invitationUrl)

// 2. Simular pago exitoso
await updatePaymentStatus(gift.data.stalkerGift.id, {
  payment_status: "success",
  transaction_id: "txn_123"
})

// 3. Destinatario acepta el regalo
await updatePaymentStatus(gift.data.stalkerGift.id, {
  payment_status: "recibida"
})

// 4. Habilitar chat
const chatData = await enableChat(gift.data.stalkerGift.id, {
  customer_id: "cus_recipient_789"
})

// 5. Enviar mensaje
await sendMessage({
  conversation_id: chatData.data.conversation.id,
  sender_id: "cus_giver_456",
  content: "Hola! Soy tu admirador secreto",
  message_type: "text"
})
```

---

## 🔒 Manejo de Errores

Todas las funciones pueden lanzar errores. Usa try/catch:

```typescript
try {
  const result = await createStalkerGift(payload)
  console.log("Exito:", result)
} catch (error) {
  console.error("Error:", error.message)
  // Mostrar mensaje de error al usuario
}
```

---

## 🎯 Integracion con React

### Hook Personalizado

```typescript
import { useState } from "react"
import { createStalkerGift } from "@/lib/data/stalker-gift"

export function useStalkerGiftCreate() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)

  const create = async (payload: any) => {
    setLoading(true)
    setError(null)

    try {
      const data = await createStalkerGift(payload)
      setResult(data)
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { create, loading, error, result }
}
```

**Uso en componente:**
```typescript
function MyComponent() {
  const { create, loading, error } = useStalkerGiftCreate()

  const handleSubmit = async () => {
    try {
      const result = await create({
        // ... payload
      })
      alert(`Regalo creado! URL: ${result.data.invitationUrl}`)
    } catch (err) {
      alert("Error al crear regalo")
    }
  }

  return (
    <button onClick={handleSubmit} disabled={loading}>
      {loading ? "Creando..." : "Crear Regalo"}
    </button>
  )
}
```

---

## 📚 Recursos Adicionales

- Backend API Docs: `Tanku/src/modules/stalker_gift/routes/README.md`
- Contexto React: `Tanku-storefront/src/lib/context/stalker-gift-context.tsx`
- Componente Principal: `Tanku-storefront/src/modules/home/components/tabs/StalkerGiftTab.tsx`

---

**Fecha:** 2025-01-22
**Version:** 1.0.0