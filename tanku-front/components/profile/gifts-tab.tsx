'use client'

import React, { useState, useEffect, useMemo } from 'react'
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
import { isRemoteImageSrc } from '@/lib/utils/remote-image'
import { isDateInRange } from '@/lib/utils/mis-tankus-period'

/** Superficie alineada con compras; `ring` = stroke verde (recibido) o azul Tanku (enviado). */
const GIFT_SURFACE_CLASS =
  'rounded-xl border border-[#414141] shadow-xl bg-[#171B21] ring-2 ring-offset-0 ring-offset-[#171B21]'

interface GiftOrder {
  id: string
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
  }>
  address: {
    city: string
    state: string
    country: string
  } | null
}

export type GiftDirection = 'sent' | 'received'

export type GiftWithDirection = GiftOrder & { direction: GiftDirection }

interface GiftsTabProps {
  userId?: string
  /** Filtra regalos por `createdAt` dentro del rango (inclusive). */
  timeRange?: { start: Date; end: Date }
}

function getGiftAccentRing(direction: GiftDirection): string {
  return direction === 'received' ? 'ring-[#73FFA2]' : 'ring-[#66DEDB]'
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

function getDropiStatusColor(status: string | null | undefined) {
  if (!status) return 'bg-gray-900/20 text-gray-400 border-gray-400/30'
  const statusUpper = status.toUpperCase()
  switch (statusUpper) {
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

function formatDropiStatus(status: string | null | undefined) {
  if (!status) return 'Sin estado'
  const statusMap: Record<string, string> = {
    PENDING: 'Pendiente',
    PROCESSING: 'En proceso',
    SHIPPED: 'Enviado',
    DELIVERED: 'Entregado',
    CANCELLED: 'Cancelado',
    REJECTED: 'Rechazado',
  }
  return statusMap[status.toUpperCase()] || status
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
  const shortId = gift.id.slice(-8).toUpperCase()
  const accentRing = getGiftAccentRing(direction)
  const counterparty =
    gift.otherUser &&
    (gift.otherUser.firstName && gift.otherUser.lastName
      ? `${gift.otherUser.firstName} ${gift.otherUser.lastName}`
      : gift.otherUser.firstName || gift.otherUser.username || 'Usuario')
  const counterpartyLabel = direction === 'sent' ? 'Para' : 'De'
  const directionLabel = direction === 'sent' ? 'Enviado' : 'Recibido'
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
              Regalo · {directionLabel}
            </span>
            <span className="text-sm text-gray-100">{formatDate(gift.createdAt)}</span>
          </div>
          <div>
            <span className="block text-[9px] font-medium uppercase tracking-wide text-gray-500">
              N.º regalo
            </span>
            <span className="font-mono text-sm text-[#66DEDB]">#{shortId}</span>
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
            {directionLabel}
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
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${getStatusColor(statusKey)}`}
          >
            {getStatusIcon(statusKey)}
            {formatStatus(statusKey)}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${getStatusColor(gift.paymentStatus)}`}
          >
            {getStatusIcon(gift.paymentStatus)}
            Pago: {formatStatus(gift.paymentStatus)}
          </span>
          {direction === 'sent' && gift.total !== undefined && (
            <span className="text-sm font-semibold tabular-nums text-white">{formatPrice(gift.total)}</span>
          )}
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
                    {item.dropiStatus && (
                      <div className="mt-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${getDropiStatusColor(item.dropiStatus)}`}
                        >
                          Envío: {formatDropiStatus(item.dropiStatus)}
                        </span>
                      </div>
                    )}
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

export function GiftsTab({ userId, timeRange }: GiftsTabProps) {
  const [sentGifts, setSentGifts] = useState<GiftOrder[]>([])
  const [receivedGifts, setReceivedGifts] = useState<GiftOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGift, setSelectedGift] = useState<GiftWithDirection | null>(null)
  const [showGiftDetails, setShowGiftDetails] = useState(false)

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

  const filteredGifts = useMemo(() => {
    if (!timeRange) return mergedGifts
    return mergedGifts.filter((g) => isDateInRange(g.createdAt, timeRange))
  }, [mergedGifts, timeRange])

  const loadGifts = async () => {
    try {
      setLoading(true)

      const sentResponse = await apiClient.get<{ orders: GiftOrder[]; count: number }>(
        `${API_ENDPOINTS.GIFTS.ORDERS}?type=sent`
      )

      const receivedResponse = await apiClient.get<{ orders: GiftOrder[]; count: number }>(
        `${API_ENDPOINTS.GIFTS.ORDERS}?type=received`
      )

      if (sentResponse.success && sentResponse.data) {
        setSentGifts(sentResponse.data.orders || [])
      }

      if (receivedResponse.success && receivedResponse.data) {
        setReceivedGifts(receivedResponse.data.orders || [])
      }
    } catch (error) {
      console.error('Error al cargar regalos:', error)
      setSentGifts([])
      setReceivedGifts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      loadGifts()
    }
  }, [userId])

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
  }

  const isSender = selectedGift?.direction === 'sent'

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
            Cuando envíes o recibas regalos, aparecerán aquí. El borde indica si fue enviado (azul
            Tanku) o recibido (verde).
          </p>
        </div>
      ) : filteredGifts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-700">
            <GiftIcon className="h-8 w-8 text-gray-400 opacity-70" />
          </div>
          <h4 className="mb-2 text-lg font-medium text-white">Sin regalos en este período</h4>
          <p className="text-sm text-gray-400">
            Prueba otro rango de fechas en el selector de período. El borde verde es recibido y el
            azul Tanku, enviado.
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
        <div
          className="fixed inset-0 z-[1000020] flex bg-black/55 backdrop-blur-[2px] max-md:flex-col max-md:pt-[max(3.25rem,calc(env(safe-area-inset-top,0px)+2.5rem))] max-md:pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:items-center md:justify-center md:p-4"
          onClick={closeGiftDetails}
        >
          <div
            className={`flex max-md:h-full max-md:min-h-0 w-full max-w-2xl flex-col overflow-hidden md:max-h-[90vh] md:rounded-xl ${GIFT_SURFACE_CLASS} ${getGiftAccentRing(selectedGift.direction)}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex shrink-0 items-center justify-between border-b bg-[#171B21] px-4 py-3"
              style={NOTIFICATION_ROW_DIVIDER_STYLE}
            >
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                  {selectedGift.direction === 'sent' ? 'Regalo enviado' : 'Regalo recibido'}
                </p>
                <h3 className="text-base font-semibold text-white">
                  Orden{' '}
                  <span className="text-[#66DEDB]">#{selectedGift.id.slice(-8).toUpperCase()}</span>
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

            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
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
                        {selectedGift.address && (
                          <p className="text-sm text-gray-400">
                            {selectedGift.address.city}, {selectedGift.address.state}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-[#414141]/90 bg-black/20 p-3">
                    <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                      Estado
                    </h4>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${getStatusColor(
                        selectedGift.paymentStatus === 'cancelled' ? 'cancelled' : selectedGift.status
                      )}`}
                    >
                      {getStatusIcon(
                        selectedGift.paymentStatus === 'cancelled' ? 'cancelled' : selectedGift.status
                      )}
                      {formatStatus(
                        selectedGift.paymentStatus === 'cancelled' ? 'cancelled' : selectedGift.status
                      )}
                    </span>
                  </div>
                  <div className="rounded-lg border border-[#414141]/90 bg-black/20 p-3">
                    <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                      Pago
                    </h4>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${getStatusColor(selectedGift.paymentStatus)}`}
                    >
                      {getStatusIcon(selectedGift.paymentStatus)}
                      {formatStatus(selectedGift.paymentStatus)}
                    </span>
                  </div>
                </div>

                {isSender && selectedGift.total !== undefined && (
                  <div className="rounded-lg border border-[#414141]/90 bg-black/20 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-400">Total</span>
                      <span className="text-lg font-bold text-[#73FFA2]">
                        {formatPrice(selectedGift.total)}
                      </span>
                    </div>
                  </div>
                )}

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
                            {item.dropiStatus && (
                              <div className="mt-2">
                                <span
                                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${getDropiStatusColor(item.dropiStatus)}`}
                                >
                                  Envío: {formatDropiStatus(item.dropiStatus)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
