import type { StalkerGiftDTO } from '@/types/api'

/**
 * Chat StalkerGift: el backend sólo crea/conecta conversación tras aceptar el regalo y existir pedido tienda (Dropi/proveedor).
 * No debe mostrarse navegación a chat antes de esa condición.
 */
export function canOpenStalkerGiftChat(gift: StalkerGiftDTO): boolean {
  return (
    gift.estado === 'ACCEPTED' &&
    Boolean(gift.orderId) &&
    Boolean(gift.chatEnabled) &&
    Boolean(gift.conversationId)
  )
}

/** Aceptado y pedido creado, pero chat aún no está listo en el cliente. */
export function stalkerGiftChatPending(gift: StalkerGiftDTO): boolean {
  return (
    gift.estado === 'ACCEPTED' &&
    Boolean(gift.orderId) &&
    !(gift.chatEnabled && gift.conversationId)
  )
}
