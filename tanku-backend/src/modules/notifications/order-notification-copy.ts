/**
 * Copy legible para notificaciones de estado de pedido (Dropi).
 * Evita frases genéricas tipo "El estado de tu orden ha cambiado a: X".
 */

export type OrderStatusCopy = {
  title: string;
  message: string;
};

const STATUS_COPY: Record<string, OrderStatusCopy> = {
  PENDIENTE: {
    title: 'Pedido en proceso',
    message: 'Estamos preparando tu pedido',
  },
  PENDING: {
    title: 'Pedido en proceso',
    message: 'Estamos preparando tu pedido',
  },
  GUIA_GENERADA: {
    title: 'Guía de envío lista',
    message: 'Tu pedido ya tiene guía de envío',
  },
  EN_TRANSITO: {
    title: 'Pedido en camino',
    message: 'Tu pedido va en camino',
  },
  IN_TRANSIT: {
    title: 'Pedido en camino',
    message: 'Tu pedido va en camino',
  },
  ENTREGADO: {
    title: 'Pedido entregado',
    message: 'Tu pedido fue entregado',
  },
  DELIVERED: {
    title: 'Pedido entregado',
    message: 'Tu pedido fue entregado',
  },
  DEVUELTO: {
    title: 'Pedido devuelto',
    message: 'Tu pedido fue devuelto al remitente',
  },
  RETURNED: {
    title: 'Pedido devuelto',
    message: 'Tu pedido fue devuelto al remitente',
  },
  NOVEDAD: {
    title: 'Novedad en tu pedido',
    message: 'Hay una incidencia con tu pedido',
  },
};

function normalizeStatusKey(status: string): string {
  return status.trim().toUpperCase().replace(/\s+/g, '_');
}

/** Convierte "EN_TRANSITO" → "En tránsito", "entregado" → "Entregado". */
function humanizeStatus(status: string): string {
  const normalized = normalizeStatusKey(status);
  const words: Record<string, string> = {
    PENDIENTE: 'en proceso',
    PENDING: 'en proceso',
    GUIA_GENERADA: 'con guía de envío',
    EN_TRANSITO: 'en camino',
    IN_TRANSIT: 'en camino',
    ENTREGADO: 'entregado',
    DELIVERED: 'entregado',
    DEVUELTO: 'devuelto',
    RETURNED: 'devuelto',
    NOVEDAD: 'con novedad',
  };
  if (words[normalized]) return words[normalized];

  return status
    .trim()
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getOrderStatusNotificationCopy(status: string): OrderStatusCopy {
  const key = normalizeStatusKey(status);
  if (STATUS_COPY[key]) return STATUS_COPY[key];

  const human = humanizeStatus(status);
  return {
    title: 'Actualización de pedido',
    message: `Tu pedido está ${human}`,
  };
}

export function getStalkerGiftOrderNotificationCopy(
  role: 'receiver' | 'sender',
  status: string
): OrderStatusCopy {
  const base = getOrderStatusNotificationCopy(status);
  if (role === 'receiver') {
    return {
      title: 'Tu regalo',
      message: base.message.replace(/^Tu pedido/, 'Tu regalo'),
    };
  }
  return {
    title: 'Regalo que enviaste',
    message: base.message.replace(/^Tu pedido/, 'El regalo'),
  };
}
