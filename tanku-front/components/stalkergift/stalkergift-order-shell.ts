/**
 * Superficies unificadas: misma “cáscara” para regalos sin orden y para filas de orden StalkerGift.
 * Base sin `cursor-pointer` (las órdenes añaden pointer al abrir modal).
 */
export const STALKERGIFT_SHELL_SENDER_BASE =
  'rounded-xl border border-[#66DEDB]/45 bg-[#171B21] shadow-xl p-4 ring-1 ring-[#66DEDB]/12 transition-colors hover:border-[#66DEDB]/70 hover:ring-[#66DEDB]/22'

export const STALKERGIFT_SHELL_RECEIVER_BASE =
  'rounded-xl border border-[#73FFA2]/45 bg-[#171B21] shadow-xl p-4 ring-1 ring-[#73FFA2]/14 transition-colors hover:border-[#73FFA2]/72 hover:ring-[#73FFA2]/22'

/** Solo listado de órdenes (click abre detalle). */
export const STALKERGIFT_ORDER_ROW_POINTER = 'cursor-pointer'
