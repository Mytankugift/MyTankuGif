'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { OrderDTO, StalkerGiftDTO } from '@/types/api'
import { GiftIcon } from '@heroicons/react/24/outline'
import { ClockIcon } from '@heroicons/react/24/solid'
import { STALKERGIFT_SHELL_RECEIVER_BASE, STALKERGIFT_SHELL_SENDER_BASE } from '@/components/stalkergift/stalkergift-order-shell'
import {
  STALKERGIFT_BTN_PRIMARY_INLINE,
  STALKERGIFT_BTN_SECONDARY_INLINE,
} from '@/components/stalkergift/stalkergift-inline-button-styles'
/** Columna de acciones cuando hay pasos rápidos (aceptar / rechazar). */
const ACTIONS_COLUMN =
  'flex w-full shrink-0 flex-col gap-1.5 border-t border-white/[0.08] pt-2.5 md:w-auto md:min-w-[9.5rem] md:border-l md:border-t-0 md:border-white/[0.08] md:pl-2.5 md:pt-0'

const ACTIONS_INNER = 'grid grid-cols-2 gap-1.5 md:flex md:flex-col md:gap-1 md:items-stretch'

const COMPACT_SHELL_OVERRIDES = '!p-0 !shadow-lg'

export interface StalkerGiftCardProps {
  gift: StalkerGiftDTO
  /** Vista envíos vs recibidos. Si falta, se usa `type`. */
  role?: 'received' | 'sent'
  /** Compatibilidad: mismo significado que `role`. */
  type?: 'received' | 'sent'
  /** Pedido de tienda vinculado (Dropi/Tanku); enriquece chips sin duplicar filas en la lista. */
  linkedOrder?: OrderDTO | null
  onUpdate?: () => void
  /** Click en “Ver detalle” — abrir modal desde el padre. */
  onOpenDetail?: () => void
}

function counterpartyShort(gift: StalkerGiftDTO, role: 'sent' | 'received'): string {
  if (role === 'received') return gift.senderAlias || 'Anónimo'
  if (gift.receiver?.firstName) return gift.receiver.firstName
  if (gift.receiver?.email) return gift.receiver.email.split('@')[0] ?? 'Destinatario'
  if (gift.externalReceiverData?.name) return gift.externalReceiverData.name
  if (gift.externalReceiverData?.instagram) return `@${gift.externalReceiverData.instagram.replace(/^@/, '')}`
  return 'Destinatario'
}

function estadoGiftPillClass(estado: StalkerGiftDTO['estado']): string {
  switch (estado) {
    case 'CREATED':
      return 'bg-gray-900/20 text-gray-400 border-gray-400/30'
    case 'PAID':
      return 'bg-blue-900/20 text-blue-400 border-blue-400/30'
    case 'WAITING_ACCEPTANCE':
      return 'bg-yellow-900/20 text-yellow-400 border-yellow-400/30'
    case 'ACCEPTED':
      return 'bg-green-900/20 text-green-400 border-green-400/30'
    case 'REJECTED':
    case 'CANCELLED':
      return 'bg-red-900/20 text-red-400 border-red-400/30'
    default:
      return 'bg-gray-900/20 text-gray-400 border-gray-400/30'
  }
}

function labelGiftEstado(estado: StalkerGiftDTO['estado']): string {
  switch (estado) {
    case 'CREATED':
      return 'Borrador'
    case 'PAID':
      return 'Pagado'
    case 'WAITING_ACCEPTANCE':
      return 'Pendiente'
    case 'ACCEPTED':
      return 'Aceptado'
    case 'REJECTED':
      return 'Rechazado'
    case 'CANCELLED':
      return 'Cancelado'
    default:
      return estado
  }
}

export function StalkerGiftCard({
  gift,
  role: roleProp,
  type,
  linkedOrder,
  onUpdate,
  onOpenDetail,
}: StalkerGiftCardProps) {
  const role = roleProp ?? type ?? 'received'
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  const handleAccept = async () => {
    if (!gift.id) return

    setIsLoading(true)
    try {
      if (gift.linkToken) {
        router.push(`/stalkergift/accept/${gift.linkToken}`)
      } else {
        router.push(`/stalkergift/accept/${gift.id}`)
      }
    } catch (err: unknown) {
      console.error('Error aceptando regalo:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReject = async () => {
    if (!gift.id || !confirm('¿Estás seguro de que quieres rechazar este regalo?')) return

    setIsLoading(true)
    try {
      const response = await apiClient.post<StalkerGiftDTO>(API_ENDPOINTS.STALKER_GIFT.REJECT(gift.id))

      if (response.success) {
        onUpdate?.()
      }
    } catch (err: unknown) {
      console.error('Error rechazando regalo:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const surface =
    (role === 'sent' ? STALKERGIFT_SHELL_SENDER_BASE : STALKERGIFT_SHELL_RECEIVER_BASE) + ' ' + COMPACT_SHELL_OVERRIDES
  const iconTone = role === 'sent' ? 'text-[#66DEDB]' : 'text-[#73FFA2]'

  const thumbSrc = gift.product?.images?.[0]
  const productTitle = gift.product?.title ?? 'Regalo'
  const refDisplay = `#${gift.id.replace(/-/g, '').slice(0, 9).toUpperCase()}`

  const showAcceptReject = role === 'received' && gift.estado === 'WAITING_ACCEPTANCE'
  const dirLabel = role === 'sent' ? 'REGALO · ENVIADO' : 'REGALO · RECIBIDO'
  const paraDeLabel = role === 'sent' ? 'PARA' : 'DE'

  const paymentLabel =
    gift.paymentStatus && gift.paymentStatus.length > 0
      ? `Pago: ${gift.paymentStatus}`
      : 'Pago: —'

  const dropiLine = linkedOrder?.items?.[0]?.dropiStatus

  return (
    <div className={`${surface} overflow-hidden`}>
      {/* Fila 1: izquierda datos · derecha Ver detalle (estado en chips debajo) */}
      <div className="flex items-center justify-between gap-3 px-3 pt-2.5 pb-2">
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-medium uppercase tracking-wide text-gray-500">{dirLabel}</p>
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0 text-[11px] leading-tight text-white">
            <span className="shrink-0 tabular-nums text-gray-400">{formatDate(gift.createdAt)}</span>
            <span className="text-gray-600">·</span>
            <span className="font-mono text-[11px] font-semibold tracking-tight text-[#66DEDB]" title="N.º regalo">
              {refDisplay}
            </span>
            <span className="text-gray-600">·</span>
            <span className="min-w-0 truncate">
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">{paraDeLabel} </span>
              <span className="font-semibold text-white/95">{counterpartyShort(gift, role)}</span>
            </span>
          </div>
        </div>
        <button
          type="button"
          className={`shrink-0 text-[11px] font-semibold leading-none ${iconTone} transition-opacity hover:opacity-85`}
          onClick={() => onOpenDetail?.()}
        >
          Ver detalle
        </button>
      </div>

      <div className="mx-3 h-px bg-gradient-to-r from-transparent via-[#66DEDB]/45 to-transparent" />

      {/* Chips: estado regalo, pago, envío */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2">
        <span
          className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-px text-[9px] font-medium ${estadoGiftPillClass(gift.estado)}`}
        >
          <ClockIcon className="h-2.5 w-2.5 opacity-90" aria-hidden />
          {labelGiftEstado(gift.estado)}
        </span>
        <span className="inline-flex items-center gap-0.5 rounded-full border border-white/12 bg-white/[0.03] px-1.5 py-px text-[9px] text-gray-400">
          <ClockIcon className="h-2.5 w-2.5 opacity-70" aria-hidden />
          {paymentLabel}
        </span>
        {dropiLine ? (
          <span className="inline-flex items-center rounded-full border border-purple-400/20 bg-purple-950/15 px-1.5 py-px text-[9px] text-purple-200/95">
            Envío {dropiLine}
          </span>
        ) : gift.orderId ? (
          <span className="inline-flex items-center rounded-full border border-white/10 bg-black/20 px-1.5 py-px text-[9px] text-gray-500">
            Pedido…
          </span>
        ) : null}
      </div>

      {/* Cuerpo: producto compacto + mensaje / acciones */}
      <div className="flex flex-col gap-2 px-3 pb-2.5 pt-0.5 md:flex-row md:items-stretch md:gap-2.5">
        <div className="flex min-w-0 flex-1 gap-2.5">
          <div className="relative h-[3.75rem] w-[3.75rem] shrink-0 overflow-hidden rounded-md border border-white/[0.07] bg-[#252a32]">
            {thumbSrc ? (
              <Image src={thumbSrc} alt={productTitle} fill className="object-cover" unoptimized />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <GiftIcon className={`h-6 w-6 ${iconTone}/80`} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-white">{productTitle}</p>
            {gift.variant?.title ? (
              <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-400">{gift.variant.title}</p>
            ) : (
              <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-500">Detalle Tanku.</p>
            )}
            <p className="mt-1 text-[10px] text-gray-500">Cant. {gift.quantity}</p>

            <div className="mt-2 border-t border-white/[0.06] pt-2">
              {role === 'received' && gift.senderMessage ? (
                <>
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500">Mensaje</p>
                  <p className="mt-0.5 line-clamp-3 text-[12px] leading-snug text-gray-300">{gift.senderMessage}</p>
                </>
              ) : role === 'sent' ? (
                <p className="text-[11px] leading-snug text-gray-400">
                  {gift.estado === 'CREATED' ? (
                    <>
                      Pago e invitación · <span className="text-[#66DEDB]">Ver detalle</span>
                    </>
                  ) : (
                    <>
                      Enlace y pedido en <span className="text-[#66DEDB]">Ver detalle</span>.
                    </>
                  )}
                </p>
              ) : (
                <p className="text-[11px] text-gray-500">Sin mensaje.</p>
              )}
            </div>
          </div>
        </div>

        {showAcceptReject ? (
          <div className={ACTIONS_COLUMN}>
            <div className={ACTIONS_INNER} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={handleAccept}
                disabled={isLoading}
                className={`${STALKERGIFT_BTN_PRIMARY_INLINE} w-full justify-center`}
              >
                {isLoading ? '…' : 'Aceptar'}
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isLoading}
                className={`${STALKERGIFT_BTN_SECONDARY_INLINE} w-full justify-center`}
              >
                Rechazar
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
