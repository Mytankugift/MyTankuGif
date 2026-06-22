'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import {
  GiftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  XMarkIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline'
import Image from 'next/image'
import { NOTIFICATION_ROW_DIVIDER_STYLE } from '@/lib/notifications-display'
import { ProfileTabletOverlayModal } from '@/components/profile/profile-tablet-overlay-modal'
import { isRemoteImageSrc } from '@/lib/utils/remote-image'
import { isDateInRange } from '@/lib/utils/mis-tankus-period'
import { displayOrderRef } from '@/lib/utils/entity-ref-display'
import { dropiStatusChipClass, formatDropiStatus } from '@/lib/dropi-status'
import { OrderItemDropiShippingModal } from '@/components/profile/order-item-dropi-shipping-modal'
import { OrderItemDropiShippingActions } from '@/components/profile/order-item-dropi-shipping-actions'
import { OrderSupportSection } from '@/components/profile/order-support-section'
import { clearProfileDeepLinkParams } from '@/lib/support-case-navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import type { OrderDTO, SupportCaseDetailDTO } from '@/types/api'

/** Superficie alineada con compras; `ring` = stroke verde (recibido) o azul Tanku (enviado). */
const GIFT_SURFACE_CLASS =
  'rounded-xl border border-[#414141] shadow-xl bg-[#171B21] ring-2 ring-offset-0 ring-offset-[#171B21]'

interface GiftOrder {
  id: string
  ref?: string | null
  status: string
  paymentStatus: string
  paymentMethod: string | null
  createdAt: string
  updatedAt: string
  total?: number
  subtotal?: number
  shippingTotal?: number
  otherUser: {
    id: string
    username: string | null
    firstName: string | null
    lastName: string | null
    avatar: string | null
  } | null
  items: Array<{
    id: string
    product: {
      id: string
      title: string
      handle: string
      images: string[]
    }
    variant: {
      id: string
      sku: string
      title: string
    }
    quantity: number
    price?: number
    finalPrice?: number
    dropiStatus?: string | null
    dropiOrderId?: number | null
    dropiWebhookData?: unknown
  }>
  address: {
    city: string
    state: string
    country: string
    firstName?: string
    lastName?: string
    phone?: string | null
    address1?: string
    address2?: string | null
    postalCode?: string
  } | null
}

export type GiftDirection = 'sent' | 'received'

export type GiftWithDirection = GiftOrder & { direction: GiftDirection }

interface GiftsTabProps {
  userId?: string
  /** Deep link postventa: ?case= (solo regalos; lo resuelve MisTankusTab) */
  initialOpenCaseId?: string | null
  /** Filtra regalos por `createdAt` dentro del rango (inclusive). */
  timeRange?: { start: Date; end: Date }
}

function getGiftAccentRing(direction: GiftDirection): string {
  return direction === 'received' ? 'ring-[#73FFA2]' : 'ring-[#66DEDB]'
}

function getDirectionBadgeLabel(direction: GiftDirection): string {
  return direction === 'sent' ? 'Enviado' : 'REGALO'
}

function getDirectionHeaderLabel(direction: GiftDirection): string {
  return direction === 'sent' ? 'Regalo · Enviado' : 'Regalo'
}

function isPaymentPaid(paymentStatus: string): boolean {
  const ps = (paymentStatus || '').toLowerCase()
  return ['paid', 'completed', 'captured', 'authorized'].some((x) => ps.includes(x))
}

function shouldShowOrderStatusChip(gift: GiftOrder): boolean {
  if (gift.paymentStatus === 'cancelled') return true
  if (isPaymentPaid(gift.paymentStatus)) return false
  const s = (gift.status || '').toLowerCase()
  return s !== 'confirmed' && s !== 'confirmado'
}

function hasFullGiftAddress(
  address: GiftOrder['address']
): address is NonNullable<GiftOrder['address']> & { address1: string } {
  return Boolean(address?.address1)
}

/** Precio del regalo: solo producto (el envío va incluido en tankuPrice). */
function getGiftProductAmount(gift: GiftOrder): number {
  const lines = gift.items.reduce((acc, item) => {
    const unit = item.finalPrice ?? item.price ?? 0
    return acc + unit * item.quantity
  }, 0)
  if (lines > 0) return lines
  if (typeof gift.subtotal === 'number' && gift.subtotal > 0) return gift.subtotal
  return gift.total ?? 0
}

function giftToOrderDTO(gift: GiftWithDirection, senderUserId: string): OrderDTO {
  const productAmount = getGiftProductAmount(gift)
  return {
    id: gift.id,
    ref: gift.ref ?? null,
    userId: senderUserId,
    email: '',
    status: gift.status,
    paymentStatus: gift.paymentStatus,
    paymentMethod: gift.paymentMethod || 'epayco',
    total: productAmount,
    subtotal: productAmount,
    shippingTotal: 0,
    items: gift.items.map((item) => ({
      id: item.id,
      productId: item.product.id,
      variantId: item.variant.id,
      quantity: item.quantity,
      price: item.price ?? item.finalPrice ?? 0,
      finalPrice: item.finalPrice ?? item.price ?? 0,
      dropiOrderId: item.dropiOrderId ?? null,
      dropiStatus: item.dropiStatus ?? null,
      dropiWebhookData: item.dropiWebhookData ?? null,
      product: {
        id: item.product.id,
        title: item.product.title,
        handle: item.product.handle,
        images: item.product.images,
      },
      variant: {
        id: item.variant.id,
        title: item.variant.title,
        price: item.price ?? item.finalPrice ?? 0,
      },
    })),
    address: hasFullGiftAddress(gift.address)
      ? {
          firstName: gift.address.firstName ?? '',
          lastName: gift.address.lastName ?? '',
          phone: gift.address.phone ?? '',
          address1: gift.address.address1,
          address2: gift.address.address2 ?? null,
          city: gift.address.city,
          state: gift.address.state,
          postalCode: gift.address.postalCode ?? '',
          country: gift.address.country,
        }
      : null,
    createdAt: gift.createdAt,
    updatedAt: gift.updatedAt,
  }
}

function getStatusIcon(status: string) {
  switch (status.toLowerCase()) {
    case 'pending':
    case 'pendiente':
      return <ClockIcon className="h-4 w-4 text-yellow-400" />
    case 'processing':
    case 'procesando':
    case 'confirmed':
    case 'confirmado':
      return <EyeIcon className="h-4 w-4 text-blue-400" />
    case 'shipped':
    case 'enviado':
      return <ShoppingBagIcon className="h-4 w-4 text-purple-400" />
    case 'delivered':
    case 'entregado':
      return <CheckCircleIcon className="h-4 w-4 text-green-400" />
    case 'cancelled':
    case 'cancelado':
      return <XCircleIcon className="h-4 w-4 text-red-400" />
    default:
      return <ClockIcon className="h-4 w-4 text-gray-400" />
  }
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

function getPaymentChipClass(paymentStatus: string): string {
  if (isPaymentPaid(paymentStatus)) {
    return 'bg-[#73FFA2]/20 text-[#73FFA2] border-[#73FFA2]/50 ring-1 ring-[#73FFA2]/35 font-semibold shadow-[0_0_12px_rgba(115,255,162,0.12)]'
  }
  const s = (paymentStatus || '').toLowerCase()
  if (s === 'cancelled' || s === 'cancelado') return getStatusColor('cancelled')
  if (['pending', 'pendiente', 'awaiting', 'not_paid'].some((x) => s.includes(x))) {
    return getStatusColor('pending')
  }
  return getStatusColor(paymentStatus)
}

function getPaymentStatusIcon(paymentStatus: string) {
  if (isPaymentPaid(paymentStatus)) {
    return <CheckCircleIcon className="h-4 w-4 shrink-0 text-[#73FFA2]" />
  }
  return getStatusIcon(paymentStatus)
}

function giftItemHasShippingTracking(item: {
  dropiStatus?: string | null
  dropiOrderId?: number | null
}) {
  return Boolean(item.dropiOrderId || item.dropiStatus)
}

function GiftItemShippingStatusChip({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${dropiStatusChipClass(status)}`}
    >
      Estado: {formatDropiStatus(status)}
    </span>
  )
}

function GiftItemShippingDetail({
  item,
  onViewHistory,
}: {
  item: GiftOrder['items'][number]
  onViewHistory: () => void
}) {
  if (!giftItemHasShippingTracking(item)) return null

  return (
    <div className="mt-2">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">
        Estado del envío
      </p>
      <div className="flex flex-col items-start gap-1.5">
        {item.dropiStatus ? (
          <GiftItemShippingStatusChip status={item.dropiStatus} />
        ) : (
          <span className="text-[11px] text-gray-500">Sin actualizar aún</span>
        )}
        <OrderItemDropiShippingActions
          item={item}
          onViewShipping={onViewHistory}
          linkLabel="Ver historial"
          title="Ver historial del envío"
        />
      </div>
    </div>
  )
}

function GiftPurchaseCard({
  gift,
  direction,
  onViewDetails,
  formatDate,
  formatPrice,
  formatStatus,
}: {
  gift: GiftOrder
  direction: GiftDirection
  onViewDetails: (g: GiftWithDirection) => void
  formatDate: (s: string) => string
  formatPrice: (n: number) => string
  formatStatus: (s: string) => string
}) {
  const accentRing = getGiftAccentRing(direction)
  const counterparty =
    gift.otherUser &&
    (gift.otherUser.firstName && gift.otherUser.lastName
      ? `${gift.otherUser.firstName} ${gift.otherUser.lastName}`
      : gift.otherUser.firstName || gift.otherUser.username || 'Usuario')
  const counterpartyLabel = direction === 'sent' ? 'Para' : 'De'
  const directionBadgeLabel = getDirectionBadgeLabel(direction)
  const directionHeaderLabel = getDirectionHeaderLabel(direction)
  const directionBadgeClass =
    direction === 'sent'
      ? 'bg-[#66DEDB]/15 text-[#66DEDB] ring-1 ring-[#66DEDB]/35'
      : 'bg-[#73FFA2]/15 text-[#73FFA2] ring-1 ring-[#73FFA2]/35'

  const statusKey = gift.paymentStatus === 'cancelled' ? 'cancelled' : gift.status

  return (
    <div className={`overflow-hidden ${GIFT_SURFACE_CLASS} ${accentRing}`}>
      <div
        className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2.5 sm:gap-3 sm:px-4"
        style={NOTIFICATION_ROW_DIVIDER_STYLE}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-x-4 gap-y-2">
          <div>
            <span className="block text-[9px] font-medium uppercase tracking-wide text-gray-500">
              {directionHeaderLabel}
            </span>
            <span className="text-sm text-gray-100">{formatDate(gift.createdAt)}</span>
          </div>
          <div>
            <span className="block text-[9px] font-medium uppercase tracking-wide text-gray-500">
              N.º regalo
            </span>
            <span className="font-mono text-sm text-[#66DEDB]">{displayOrderRef(gift)}</span>
          </div>
          <div className="min-w-0">
            <span className="block text-[9px] font-medium uppercase tracking-wide text-gray-500">
              {counterpartyLabel}
            </span>
            <span className="line-clamp-2 text-sm text-gray-200">{counterparty || '—'}</span>
          </div>
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${directionBadgeClass}`}
          >
            {directionBadgeLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onViewDetails({ ...gift, direction })}
          className="shrink-0 text-xs font-medium text-[#73FFA2] hover:text-[#66DEDB]"
        >
          Ver detalle
        </button>
      </div>

      <div className="px-3 py-3 sm:px-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {shouldShowOrderStatusChip(gift) ? (
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${getStatusColor(statusKey)}`}
            >
              {getStatusIcon(statusKey)}
              {formatStatus(statusKey)}
            </span>
          ) : null}
          {direction === 'sent' ? (
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${getPaymentChipClass(gift.paymentStatus)}`}
            >
              {getPaymentStatusIcon(gift.paymentStatus)}
              Pago: {formatStatus(gift.paymentStatus)}
            </span>
          ) : null}
          {direction === 'sent' ? (
            <span className="text-sm font-semibold tabular-nums text-white">
              {formatPrice(getGiftProductAmount(gift))}
            </span>
          ) : null}
        </div>

        <div className="space-y-0 divide-y divide-[#414141]/80">
          {gift.items.map((item) => {
            const unit = item.finalPrice ?? item.price ?? 0
            const lineTotal = unit * item.quantity
            const img = item.product.images?.[0]
            return (
              <div key={item.id} className="py-3 first:pt-0">
                <div className="flex gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-black/25 ring-1 ring-[#414141]/60">
                    {img ? (
                      <Image
                        src={img}
                        alt={item.product.title}
                        fill
                        className="object-cover"
                        sizes="56px"
                        unoptimized={isRemoteImageSrc(img) || img.includes('.gif')}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[9px] text-gray-600">—</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-medium leading-snug text-white">
                          {item.product.title}
                        </p>
                        {item.variant?.title && (
                          <p className="mt-0.5 text-xs text-gray-500">{item.variant.title}</p>
                        )}
                        {item.quantity > 1 && (
                          <p className="mt-1 text-[11px] text-gray-500">{item.quantity} uds</p>
                        )}
                      </div>
                      {direction === 'sent' && (
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-white">
                          {formatPrice(lineTotal)}
                        </span>
                      )}
                    </div>
                    {item.dropiStatus ? (
                      <div className="mt-2">
                        <GiftItemShippingStatusChip status={item.dropiStatus} />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function GiftsTab({ userId, initialOpenCaseId = null, timeRange }: GiftsTabProps) {
  const { user } = useAuthStore()
  const [sentGifts, setSentGifts] = useState<GiftOrder[]>([])
  const [receivedGifts, setReceivedGifts] = useState<GiftOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGift, setSelectedGift] = useState<GiftWithDirection | null>(null)
  const [showGiftDetails, setShowGiftDetails] = useState(false)
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<string | null>(null)
  const [deepLinkSupportCaseId, setDeepLinkSupportCaseId] = useState<string | null>(null)

  const supportCaseDeepLinkHandledRef = useRef<string | null>(null)

  useEffect(() => {
    if (!initialOpenCaseId) supportCaseDeepLinkHandledRef.current = null
  }, [initialOpenCaseId])

  const mergedGifts = useMemo((): GiftWithDirection[] => {
    const sent: GiftWithDirection[] = sentGifts.map((g) => ({ ...g, direction: 'sent' as const }))
    const received: GiftWithDirection[] = receivedGifts.map((g) => ({
      ...g,
      direction: 'received' as const,
    }))
    return [...sent, ...received].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [sentGifts, receivedGifts])

  const handleSupportDeepLinkConsumed = useCallback(() => {
    setDeepLinkSupportCaseId(null)
    clearProfileDeepLinkParams()
  }, [])

  const filteredGifts = useMemo(() => {
    if (!timeRange) return mergedGifts
    return mergedGifts.filter((g) => isDateInRange(g.createdAt, timeRange))
  }, [mergedGifts, timeRange])

  const mergeGiftOrders = (
    sent: GiftOrder[],
    received: GiftOrder[]
  ): GiftWithDirection[] => {
    const sentRows: GiftWithDirection[] = sent.map((g) => ({ ...g, direction: 'sent' as const }))
    const receivedRows: GiftWithDirection[] = received.map((g) => ({
      ...g,
      direction: 'received' as const,
    }))
    return [...sentRows, ...receivedRows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  const openGiftFromList = useCallback((orderId: string, list: GiftWithDirection[]): boolean => {
    const existing = list.find((g) => g.id === orderId)
    if (!existing) return false
    setSelectedGift(existing)
    setShowGiftDetails(true)
    return true
  }, [])

  const loadGifts = async (): Promise<GiftWithDirection[]> => {
    try {
      setLoading(true)

      const sentResponse = await apiClient.get<{ orders: GiftOrder[]; count: number }>(
        `${API_ENDPOINTS.GIFTS.ORDERS}?type=sent`
      )

      const receivedResponse = await apiClient.get<{ orders: GiftOrder[]; count: number }>(
        `${API_ENDPOINTS.GIFTS.ORDERS}?type=received`
      )

      const sent = sentResponse.success && sentResponse.data ? sentResponse.data.orders || [] : []
      const received =
        receivedResponse.success && receivedResponse.data ? receivedResponse.data.orders || [] : []

      setSentGifts(sent)
      setReceivedGifts(received)
      return mergeGiftOrders(sent, received)
    } catch (error) {
      console.error('Error al cargar regalos:', error)
      setSentGifts([])
      setReceivedGifts([])
      return []
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      loadGifts()
    }
  }, [userId])

  // Deep link postventa (?case=): abrir regalo y modal de soporte
  useEffect(() => {
    if (!initialOpenCaseId || loading) return
    if (supportCaseDeepLinkHandledRef.current === initialOpenCaseId) return

    let cancelled = false

    void (async () => {
      try {
        const caseResponse = await apiClient.get<SupportCaseDetailDTO>(
          API_ENDPOINTS.SUPPORT_CASES.BY_ID(initialOpenCaseId)
        )
        if (cancelled || !caseResponse.success || !caseResponse.data) return

        const orderId = caseResponse.data.orderId
        let giftList = mergedGifts
        if (!openGiftFromList(orderId, giftList)) {
          giftList = await loadGifts()
          if (cancelled || !openGiftFromList(orderId, giftList)) return
        }

        supportCaseDeepLinkHandledRef.current = initialOpenCaseId
        setDeepLinkSupportCaseId(initialOpenCaseId)
        clearProfileDeepLinkParams()
      } catch (error) {
        console.error('Error al abrir caso de soporte de regalo desde notificación:', error)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [initialOpenCaseId, loading, mergedGifts, openGiftFromList])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'Pendiente',
      paid: 'Pagado',
      processing: 'Procesando',
      confirmed: 'Confirmado',
      shipped: 'Enviado',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
    }
    return statusMap[status.toLowerCase()] || status
  }

  const handleViewGift = (gift: GiftWithDirection) => {
    setSelectedGift(gift)
    setShowGiftDetails(true)
  }

  const closeGiftDetails = () => {
    setSelectedGift(null)
    setShowGiftDetails(false)
    setSelectedItemForHistory(null)
  }

  const isSender = selectedGift?.direction === 'sent'
  const supportOrder =
    selectedGift && isSender && user?.id
      ? giftToOrderDTO(selectedGift, user.id)
      : null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#73FFA2]"></div>
        <span className="ml-2 text-white">Cargando regalos...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {mergedGifts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-700">
            <GiftIcon className="h-8 w-8 text-gray-400" />
          </div>
          <h4 className="mb-2 text-lg font-medium text-white">Sin regalos aún</h4>
          <p className="text-sm text-gray-400">
            Cuando envíes o recibas regalos, aparecerán aquí. El borde azul Tanku es enviado; el
            verde es regalo recibido.
          </p>
        </div>
      ) : filteredGifts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-700">
            <GiftIcon className="h-8 w-8 text-gray-400 opacity-70" />
          </div>
          <h4 className="mb-2 text-lg font-medium text-white">Sin regalos en este período</h4>
          <p className="text-sm text-gray-400">
            Prueba otro rango de fechas en el selector de período. Verde = regalo; azul Tanku =
            enviado.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGifts.map((row) => (
            <GiftPurchaseCard
              key={`${row.direction}-${row.id}`}
              gift={row}
              direction={row.direction}
              onViewDetails={handleViewGift}
              formatDate={formatDate}
              formatPrice={formatPrice}
              formatStatus={formatStatus}
            />
          ))}
        </div>
      )}

      {showGiftDetails && selectedGift && (
        <ProfileTabletOverlayModal
          open
          onClose={closeGiftDetails}
          titleId="gift-details-title"
          mobileLayout="dialog"
          mobileBackdrop="blur"
          maxWidthClass="max-w-lg"
          panelHeightClass="h-auto max-md:max-h-[min(46rem,93dvh)] md:max-h-[min(44rem,90vh)]"
          panelClassName={`flex min-h-0 flex-col overflow-hidden ${getGiftAccentRing(selectedGift.direction)}`}
        >
            <div
              className="flex shrink-0 items-center justify-between border-b bg-[#171B21] px-4 py-3"
              style={NOTIFICATION_ROW_DIVIDER_STYLE}
            >
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                  {selectedGift.direction === 'sent' ? 'Regalo enviado' : 'Regalo'}
                </p>
                <h3 id="gift-details-title" className="text-base font-semibold text-white">
                  Orden{' '}
                  <span className="text-[#66DEDB]">{displayOrderRef(selectedGift)}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={closeGiftDetails}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                aria-label="Cerrar"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
                <div
                  className={
                    !isSender && hasFullGiftAddress(selectedGift.address)
                      ? 'grid grid-cols-1 gap-4 lg:grid-cols-2'
                      : 'grid grid-cols-1 gap-4'
                  }
                >
                  <div className="space-y-4">
                    {selectedGift.otherUser && (
                      <div className="rounded-lg border border-[#414141]/90 bg-black/20 p-3">
                        <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                          {isSender ? 'Enviado a' : 'Enviado por'}
                        </h4>
                        <div className="flex items-center gap-3">
                          {selectedGift.otherUser.avatar && (
                            <Image
                              src={selectedGift.otherUser.avatar}
                              alt={selectedGift.otherUser.firstName || 'Usuario'}
                              width={48}
                              height={48}
                              className="rounded-full"
                              unoptimized
                            />
                          )}
                          <div>
                            <p className="font-medium text-white">
                              {selectedGift.otherUser.firstName && selectedGift.otherUser.lastName
                                ? `${selectedGift.otherUser.firstName} ${selectedGift.otherUser.lastName}`
                                : selectedGift.otherUser.firstName ||
                                  selectedGift.otherUser.username ||
                                  'Usuario'}
                            </p>
                            {isSender && selectedGift.address && (
                              <p className="text-sm text-gray-400">
                                {selectedGift.address.city}, {selectedGift.address.state}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="rounded-lg border border-[#414141]/90 bg-black/20 p-3">
                      <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                        {isSender ? 'Pago' : 'Regalo'}
                      </h4>
                      {isSender ? (
                        <div className="space-y-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${getPaymentChipClass(selectedGift.paymentStatus)}`}
                          >
                            {getPaymentStatusIcon(selectedGift.paymentStatus)}
                            Pago: {formatStatus(selectedGift.paymentStatus)}
                          </span>
                          <div className="flex items-center justify-between gap-3 border-t border-[#414141]/60 pt-2">
                            <span className="text-sm font-medium text-gray-400">Total pagado</span>
                            <span className="text-lg font-bold text-[#73FFA2]">
                              {formatPrice(getGiftProductAmount(selectedGift))}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500">Incluye envío en el precio del producto.</p>
                        </div>
                      ) : null}
                      <p className={`text-[11px] leading-relaxed text-gray-500 ${isSender ? 'mt-2' : ''}`}>
                        {formatDate(selectedGift.createdAt)}
                      </p>
                    </div>
                  </div>

                  {!isSender && hasFullGiftAddress(selectedGift.address) ? (
                    <div className="rounded-lg border border-[#414141]/90 bg-black/20 p-3">
                      <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                        Dirección de envío
                      </h4>
                      <div className="space-y-1 text-sm text-gray-200">
                        <p className="font-medium text-white">
                          {selectedGift.address.firstName} {selectedGift.address.lastName}
                        </p>
                        <p>{selectedGift.address.address1}</p>
                        {selectedGift.address.address2 ? <p>{selectedGift.address.address2}</p> : null}
                        <p>
                          {selectedGift.address.city}, {selectedGift.address.state}{' '}
                          {selectedGift.address.postalCode}
                        </p>
                        {selectedGift.address.phone ? (
                          <p className="pt-1 text-gray-400">Tel: {selectedGift.address.phone}</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div>
                  <h4 className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Productos
                  </h4>
                  <div className="space-y-2">
                    {selectedGift.items.map((item) => (
                      <div key={item.id} className="rounded-lg border border-[#414141]/90 bg-black/20 p-3">
                        <div className="flex gap-3">
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-black/30 ring-1 ring-[#414141]/50">
                            {item.product.images?.[0] ? (
                              <Image
                                src={item.product.images[0]}
                                alt={item.product.title}
                                fill
                                className="object-cover"
                                sizes="64px"
                                unoptimized={
                                  isRemoteImageSrc(item.product.images[0]) ||
                                  item.product.images[0]?.includes('.gif') === true
                                }
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-600">
                                —
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-white">{item.product.title}</div>
                            {item.variant.title && (
                              <div className="mt-0.5 text-xs text-gray-500">{item.variant.title}</div>
                            )}
                            <div className="mt-1 text-xs text-gray-500">Cantidad: {item.quantity}</div>
                            {isSender && item.finalPrice !== undefined && (
                              <div className="mt-1 text-sm font-semibold text-[#66DEDB]">
                                {formatPrice(item.finalPrice * item.quantity)}
                              </div>
                            )}
                            <GiftItemShippingDetail
                              item={item}
                              onViewHistory={() => setSelectedItemForHistory(item.id)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {supportOrder ? (
                <OrderSupportSection
                  order={supportOrder}
                  variant="footer"
                  initialOpenSupportCaseId={deepLinkSupportCaseId}
                  onSupportDeepLinkConsumed={handleSupportDeepLinkConsumed}
                />
              ) : null}
            </div>
        </ProfileTabletOverlayModal>
      )}

      {selectedGift && selectedItemForHistory ? (
        <OrderItemDropiShippingModal
          open
          onClose={() => setSelectedItemForHistory(null)}
          orderItemId={selectedItemForHistory}
          productTitle={
            selectedGift.items.find((i) => i.id === selectedItemForHistory)?.product.title ??
            'Producto'
          }
          tankuDropiStatus={
            selectedGift.items.find((i) => i.id === selectedItemForHistory)?.dropiStatus
          }
          dropiWebhookData={
            selectedGift.items.find((i) => i.id === selectedItemForHistory)?.dropiWebhookData
          }
        />
      ) : null}
    </div>
  )
}
