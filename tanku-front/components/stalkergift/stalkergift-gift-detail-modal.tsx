'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  GiftIcon,
  XMarkIcon,
  ChatBubbleLeftIcon,
  LinkIcon,
} from '@heroicons/react/24/outline'
import type { OrderDTO, StalkerGiftDTO } from '@/types/api'
import { useAuthStore } from '@/lib/stores/auth-store'
import { STALKERGIFT_BTN_SECONDARY_INLINE } from '@/components/stalkergift/stalkergift-inline-button-styles'
import { canOpenStalkerGiftChat, stalkerGiftChatPending } from '@/components/stalkergift/stalkergift-chat-policy'
import { displayGiftRef, displayOrderRef } from '@/lib/utils/entity-ref-display'

interface StalkerGiftDetailModalProps {
  isOpen: boolean
  onClose: () => void
  gift: StalkerGiftDTO
  role: 'sent' | 'received'
  /** Pedido físico cuando ya existe en Tanku/Dropi. */
  linkedOrder?: OrderDTO | null
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getShipStatusColor(status: string | null | undefined) {
  if (!status) return 'bg-gray-900/30 text-gray-400 border-gray-500/30'
  const u = status.toUpperCase()
  switch (u) {
    case 'PENDING':
      return 'bg-yellow-900/20 text-yellow-400 border-yellow-400/30'
    case 'PROCESSING':
      return 'bg-blue-900/20 text-blue-400 border-blue-400/30'
    case 'SHIPPED':
      return 'bg-purple-900/20 text-purple-400 border-purple-400/30'
    case 'DELIVERED':
      return 'bg-green-900/20 text-green-400 border-green-400/30'
    case 'CANCELLED':
    case 'REJECTED':
      return 'bg-red-900/20 text-red-400 border-red-400/30'
    default:
      return 'bg-gray-900/20 text-gray-400 border-gray-400/30'
  }
}

function formatShipStatus(status: string | null | undefined) {
  if (!status) return 'Sin actualizar'
  const map: Record<string, string> = {
    PENDING: 'Pendiente',
    PROCESSING: 'En proceso',
    SHIPPED: 'Enviado',
    DELIVERED: 'Entregado',
    CANCELLED: 'Cancelado',
    REJECTED: 'Rechazado',
  }
  return map[status.toUpperCase()] || status
}

function formatOrderStatusFriendly(status: string) {
  const s = status.toLowerCase()
  const map: Record<string, string> = {
    pending: 'Pendiente',
    processing: 'En preparación',
    procesando: 'En preparación',
    confirmed: 'Confirmado',
    confirmado: 'Confirmado',
    shipped: 'Enviado',
    enviado: 'Enviado',
    delivered: 'Entregado',
    entregado: 'Entregado',
    cancelled: 'Cancelado',
    cancelado: 'Cancelado',
  }
  return map[s] ?? status
}

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'pending':
    case 'pendiente':
      return 'bg-yellow-900/20 text-yellow-400 border-yellow-400/30'
    case 'processing':
    case 'procesando':
    case 'confirmed':
    case 'confirmado':
      return 'bg-blue-900/20 text-blue-400 border-blue-400/30'
    case 'shipped':
    case 'enviado':
      return 'bg-purple-900/20 text-purple-400 border-purple-400/30'
    case 'delivered':
    case 'entregado':
      return 'bg-green-900/20 text-green-400 border-green-400/30'
    case 'cancelled':
    case 'cancelado':
      return 'bg-red-900/20 text-red-400 border-red-400/30'
    default:
      return 'bg-gray-900/20 text-gray-400 border-gray-400/30'
  }
}

function counterpartyName(gift: StalkerGiftDTO, role: 'sent' | 'received'): { label: string; value: string } {
  if (role === 'received') {
    return { label: 'De', value: gift.senderAlias || 'Anónimo' }
  }
  if (gift.receiver) {
    return {
      label: 'Para',
      value: gift.receiver.firstName ?? gift.receiver.email ?? '—',
    }
  }
  if (gift.externalReceiverData) {
    return {
      label: 'Para',
      value:
        gift.externalReceiverData.name ??
        gift.externalReceiverData.instagram ??
        gift.externalReceiverData.email ??
        'Destinatario',
    }
  }
  return { label: 'Para', value: 'Por definir' }
}

export function StalkerGiftDetailModal({
  isOpen,
  onClose,
  gift,
  role,
  linkedOrder,
}: StalkerGiftDetailModalProps) {
  const router = useRouter()
  const { user } = useAuthStore()

  const isSenderGift = role === 'sent'

  const orderIsSender =
    linkedOrder?.stalkerGift != null ? linkedOrder.stalkerGift.senderId === user?.id : isSenderGift

  const thumb = gift.product?.images?.[0]
  const title = gift.product?.title ?? 'Regalo'

  const showUniqueLink =
    role === 'sent' &&
    Boolean(gift.uniqueLink) &&
    (gift.estado === 'WAITING_ACCEPTANCE' || gift.estado === 'PAID' || gift.estado === 'ACCEPTED')

  const goChat = () => {
    if (!canOpenStalkerGiftChat(gift)) return
    router.push(`/stalkergift?conversation=${gift.conversationId}`)
    onClose()
  }

  const chatReady = canOpenStalkerGiftChat(gift)
  const chatWaiting = stalkerGiftChatPending(gift)
  /** Aceptado en app pero sin pedido físico generado (Dropi/tienda aún no emite orden). */
  const acceptedSansOrder =
    gift.estado === 'ACCEPTED' && !gift.orderId

  if (!isOpen) return null

  const surfaceBorder = isSenderGift
    ? 'border-[#66DEDB]/35 ring-1 ring-[#66DEDB]/12'
    : 'border-[#73FFA2]/35 ring-1 ring-[#73FFA2]/14'

  const cp = counterpartyName(gift, role)
  const refShort = displayGiftRef(gift)

  return (
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/50 p-4">
      <div className={`max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-[#171B21] shadow-2xl ${surfaceBorder}`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#171B21]/95 px-4 py-3 backdrop-blur">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <GiftIcon className={`h-6 w-6 ${isSenderGift ? 'text-[#66DEDB]' : 'text-[#73FFA2]'}`} />
            Detalle del regalo
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-5 p-4 sm:p-6">
          {gift.estado === 'CREATED' && role === 'sent' ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.08] px-3 py-2.5 text-[13px] leading-snug text-amber-50/95">
              Completa el pago para generar la invitación y el enlace cuando Tanku habilite el siguiente paso del StalkerGift.
            </div>
          ) : null}

          <div className="space-y-2 rounded-lg bg-black/25 p-3 text-sm ring-1 ring-white/[0.06]">
            <div className="flex justify-between gap-3">
              <span className="text-gray-400">{cp.label}</span>
              <span className="text-right font-medium text-white">{cp.value}</span>
            </div>
            <div className="flex justify-between gap-3 border-t border-white/[0.06] pt-2">
              <span className="text-gray-400">N.º regalo</span>
              <span className="font-mono text-xs text-[#66DEDB]">{refShort}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-400">Creado</span>
              <span className="text-white">{formatDate(gift.createdAt)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-400">Estado Tanku</span>
              <span className="text-right text-white capitalize">
                {gift.estado.replace(/_/g, ' ').toLowerCase()}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-400">Pago</span>
              <span className="text-right text-gray-300">{gift.paymentStatus || '—'}</span>
            </div>

            {showUniqueLink && gift.uniqueLink ? (
              <div className="border-t border-[#66DEDB]/15 pt-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Link para quien recibe
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="min-w-0 flex-1 break-all rounded-lg bg-black/30 px-2 py-1.5 font-mono text-[11px] text-gray-300">
                    {gift.uniqueLink}
                  </span>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      className={`${STALKERGIFT_BTN_SECONDARY_INLINE} inline-flex items-center gap-1.5`}
                      onClick={() => void navigator.clipboard.writeText(gift.uniqueLink!)}
                    >
                      Copiar
                    </button>
                    <a
                      href={gift.uniqueLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${STALKERGIFT_BTN_SECONDARY_INLINE} inline-flex items-center gap-1.5 no-underline`}
                    >
                      <LinkIcon className="h-3.5 w-3.5 opacity-90" />
                      Abrir
                    </a>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {gift.senderMessage ? (
            <div>
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Mensaje</h3>
              <p className="rounded-lg bg-black/25 p-3 text-sm leading-relaxed text-gray-200 ring-1 ring-white/[0.06]">
                {gift.senderMessage}
              </p>
            </div>
          ) : null}

          {linkedOrder ? (
            <div
              className={
                !orderIsSender && linkedOrder.address
                  ? 'grid gap-4 md:grid-cols-2 md:items-start md:gap-6'
                  : 'grid gap-4'
              }
            >
              <div>
                <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Pedido asociado</h3>
                <div className="space-y-2 rounded-lg bg-black/25 p-3 text-sm ring-1 ring-white/[0.06]">
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-400">Orden</span>
                    <span className="break-all font-mono text-xs text-white">{displayOrderRef(linkedOrder)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-400">Estado</span>
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${getStatusColor(linkedOrder.status)}`}>
                      {formatOrderStatusFriendly(linkedOrder.status)}
                    </span>
                  </div>
                  {!orderIsSender && linkedOrder.items[0]?.dropiStatus ? (
                    <div className="flex justify-between gap-3 border-t border-white/[0.06] pt-2">
                      <span className="text-gray-400">Envío</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] ${getShipStatusColor(linkedOrder.items[0].dropiStatus)}`}>
                        {formatShipStatus(linkedOrder.items[0].dropiStatus)}
                      </span>
                    </div>
                  ) : null}
                  {orderIsSender ? (
                    <>
                      <div className="flex justify-between gap-3 border-t border-white/[0.06] pt-2">
                        <span className="text-gray-400">Total pedido</span>
                        <span className="font-semibold text-[#66DEDB]">{formatPrice(linkedOrder.total)}</span>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              {!orderIsSender && linkedOrder.address ? (
                <div>
                  <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Dirección de envío</h3>
                  <div className="space-y-1.5 rounded-lg bg-black/25 p-3 text-sm text-gray-200 ring-1 ring-white/[0.06]">
                    <p className="font-medium text-white">
                      {linkedOrder.address.firstName} {linkedOrder.address.lastName}
                    </p>
                    <p>{linkedOrder.address.address1}</p>
                    {linkedOrder.address.address2 ? <p>{linkedOrder.address.address2}</p> : null}
                    <p>
                      {linkedOrder.address.city}, {linkedOrder.address.state} {linkedOrder.address.postalCode}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : gift.orderId ? (
            <p className="text-center text-xs text-gray-500">
              Hay un pedido vinculado; los datos aparecerán cuando sincronice.
            </p>
          ) : null}

          <div>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Producto</h3>
            <div className="flex gap-4 rounded-lg bg-black/25 p-3 ring-1 ring-white/[0.06]">
              {thumb ? (
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                  <Image src={thumb} alt={title} fill className="object-cover" unoptimized />
                </div>
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-[#252a32]">
                  <GiftIcon className={`h-8 w-8 ${isSenderGift ? 'text-[#66DEDB]/70' : 'text-[#73FFA2]/70'}`} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white">{title}</p>
                {gift.variant?.title ? <p className="text-sm text-gray-400">{gift.variant.title}</p> : null}
                <p className="text-sm text-gray-500">Cantidad: {gift.quantity}</p>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 z-[2] flex flex-col gap-2 border-t border-white/10 bg-[#171B21]/98 py-3 backdrop-blur-sm sm:flex-row sm:items-start sm:justify-end sm:gap-3">
            {chatReady ? (
              <button
                type="button"
                className={`${STALKERGIFT_BTN_SECONDARY_INLINE} w-full justify-center sm:w-auto sm:min-w-[9rem]`}
                onClick={goChat}
              >
                <ChatBubbleLeftIcon className="h-4 w-4 shrink-0 opacity-90" />
                Abrir chat
              </button>
            ) : chatWaiting ? (
              <p className="w-full text-[11px] leading-snug text-gray-500 sm:max-w-[14rem] sm:text-right">
                El pedido ya existe; cuando la tienda confirme, se habilita el chat vinculado a la orden.
              </p>
            ) : acceptedSansOrder ? (
              <p className="w-full text-[11px] leading-snug text-gray-500 sm:max-w-[14rem] sm:text-right">
                El chat se creará cuando se genere la orden del pedido (tienda/Dropi o proveedor).
              </p>
            ) : (
              <p className="w-full text-[11px] text-gray-600 sm:text-right">
                El chat no existe hasta aceptar el regalo y que exista un pedido de tienda registrado.
              </p>
            )}
            {gift.orderId ? (
              <button
                type="button"
                className={`${STALKERGIFT_BTN_SECONDARY_INLINE} w-full shrink-0 justify-center sm:w-auto sm:min-w-[9rem]`}
                onClick={() => {
                  router.push(`/stalkergift/gifts?sgFilter=all&orderId=${gift.orderId}`)
                  onClose()
                }}
              >
                Ver contexto pedido
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
