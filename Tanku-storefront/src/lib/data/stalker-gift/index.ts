/**
 * Stalker Gift API Service
 * Servicios para interactuar con el backend de Stalker Gift
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"

// Tipos
export interface CreateStalkerGiftPayload {
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

export interface StalkerGiftResponse {
  success: boolean
  data: {
    stalkerGift: {
      id: string
      total_amount: number
      alias: string
      recipient_name: string
      payment_status: string
      created_at: string
    }
    invitationUrl: string
    invitationText: string
  }
  message: string
}

export interface UpdatePaymentStatusPayload {
  payment_status: "pending" | "success" | "failed" | "recibida"
  transaction_id?: string
}

export interface EnableChatPayload {
  customer_id: string
}

export interface SendMessagePayload {
  conversation_id: string
  sender_id: string
  content: string
  message_type?: "text" | "image" | "file" | "audio"
  file_url?: string
  reply_to_id?: string
}

// ========================
// STALKER GIFT CRUD
// ========================

/**
 * Crea un nuevo stalker gift
 */
export async function createStalkerGift(
  payload: CreateStalkerGiftPayload
): Promise<StalkerGiftResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/stalker-gift`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error creating stalker gift")
    }

    return await response.json()
  } catch (error) {
    console.error("[API] Error creating stalker gift:", error)
    throw error
  }
}

/**
 * Obtiene un stalker gift por ID
 */
export async function getStalkerGiftById(id: string) {
  try {
    const response = await fetch(`${BACKEND_URL}/stalker-gift/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error fetching stalker gift")
    }

    return await response.json()
  } catch (error) {
    console.error("[API] Error fetching stalker gift:", error)
    throw error
  }
}

/**
 * Actualiza el estado de pago de un stalker gift
 */
export async function updatePaymentStatus(
  id: string,
  payload: UpdatePaymentStatusPayload
) {
  try {
    const response = await fetch(`${BACKEND_URL}/stalker-gift/${id}/payment`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error updating payment status")
    }

    return await response.json()
  } catch (error) {
    console.error("[API] Error updating payment status:", error)
    throw error
  }
}

// ========================
// CHAT FUNCTIONS
// ========================

/**
 * Habilita el chat para un stalker gift
 */
export async function enableChat(id: string, payload: EnableChatPayload) {
  try {
    const response = await fetch(
      `${BACKEND_URL}/stalker-gift/${id}/enable-chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error enabling chat")
    }

    return await response.json()
  } catch (error) {
    console.error("[API] Error enabling chat:", error)
    throw error
  }
}

/**
 * Envia un mensaje en el chat
 */
export async function sendMessage(payload: SendMessagePayload) {
  try {
    const response = await fetch(
      `${BACKEND_URL}/stalker-gift/chat/send-message`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error sending message")
    }

    return await response.json()
  } catch (error) {
    console.error("[API] Error sending message:", error)
    throw error
  }
}

/**
 * Obtiene los mensajes de una conversacion
 */
export async function getMessages(
  conversationId: string,
  customerId: string,
  limit: number = 50,
  offset: number = 0
) {
  try {
    const params = new URLSearchParams({
      customer_id: customerId,
      limit: limit.toString(),
      offset: offset.toString(),
    })

    const response = await fetch(
      `${BACKEND_URL}/stalker-gift/chat/messages/${conversationId}?${params}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error fetching messages")
    }

    return await response.json()
  } catch (error) {
    console.error("[API] Error fetching messages:", error)
    throw error
  }
}

// ========================
// UTILIDADES
// ========================

/**
 * Formatea el precio para mostrar
 */
export function formatPrice(amount: number, currencyCode: string = "COP"): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: currencyCode,
  }).format(amount)
}

/**
 * Calcula el total de productos seleccionados
 */
export function calculateTotal(
  products: Array<{ price: number; quantity: number }>
): number {
  return products.reduce((total, product) => {
    return total + product.price * product.quantity
  }, 0)
}

/**
 * Genera texto de invitacion personalizado
 */
export function generateInvitationText(
  recipientName: string,
  invitationUrl: string
): string {
  return `Hola ${recipientName}!

Tienes un regalo sorpresa esperandote!

Alguien que te aprecia mucho te ha enviado un regalo anonimo a traves de MyTanku.

Para ver tu regalo y conocer mas detalles, visita:
${invitationUrl}

No te lo pierdas!

---
MyTanku - Regalos que conectan corazones`
}

/**
 * Copia texto al portapapeles
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error("Error copying to clipboard:", error)
    return false
  }
}

/**
 * Comparte via Web Share API
 */
export async function shareViaWebShare(data: {
  title?: string
  text?: string
  url?: string
}): Promise<boolean> {
  try {
    if (navigator.share) {
      await navigator.share(data)
      return true
    } else {
      console.warn("Web Share API not supported")
      return false
    }
  } catch (error) {
    console.error("Error sharing:", error)
    return false
  }
}