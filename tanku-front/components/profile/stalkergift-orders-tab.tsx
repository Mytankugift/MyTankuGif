'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { OrderDTO } from '@/types/api'
import { useAuthStore } from '@/lib/stores/auth-store'
import {
  ShoppingBagIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  XMarkIcon,
  GiftIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline'
import Image from 'next/image'
import {
  STALKERGIFT_ORDER_ROW_POINTER,
  STALKERGIFT_SHELL_RECEIVER_BASE,
  STALKERGIFT_SHELL_SENDER_BASE,
} from '@/components/stalkergift/stalkergift-order-shell'
import {
  STALKERGIFT_BTN_SECONDARY_INLINE,
} from '@/components/stalkergift/stalkergift-inline-button-styles'

interface StalkerGiftOrdersTabProps {
  userId?: string
  initialOrderId?: string | null
  /** Órdenes ya cargadas (evita segundo fetch cuando el padre compone Mis StalkerGift) */
  providedOrders?: OrderDTO[]
  /** Si `providedOrders`, no se disparan peticiones propias */
  skipFetch?: boolean
  timeRange?: { start: Date; end: Date }
  /** Órdenes enviadas (yo pagué) vs recibidas vs todas */
  orderRole?: 'all' | 'sender' | 'receiver'
}

export function StalkerGiftOrdersTab({
  userId,
  initialOrderId,
  providedOrders,
  skipFetch,
  timeRange,
  orderRole = 'all',
}: StalkerGiftOrdersTabProps) {
  const router = useRouter()
  const modalRegaloRef = useRef<HTMLDivElement | null>(null)
  const { user } = useAuthStore()
  const [orders, setOrders] = useState<OrderDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<OrderDTO | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [selectedItemForWebhook, setSelectedItemForWebhook] = useState<string | null>(null)

  const loadOrders = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get<{ orders: OrderDTO[]; total: number; hasMore: boolean }>(
        API_ENDPOINTS.ORDERS.STALKER_GIFTS
      )

      if (response.success && response.data) {
        if (response.data && typeof response.data === 'object' && 'orders' in response.data) {
          setOrders(Array.isArray(response.data.orders) ? response.data.orders : [])
        } else if (Array.isArray(response.data)) {
          setOrders(response.data)
        } else {
          setOrders([])
        }
      } else {
        setOrders([])
      }
    } catch (error) {
      console.error('Error al cargar órdenes de StalkerGift:', error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (skipFetch && providedOrders) {
      setOrders(providedOrders)
      setLoading(false)
      return
    }
    if (skipFetch) {
      setLoading(false)
      return
    }
    if (userId) {
      loadOrders()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, skipFetch])

  useEffect(() => {
    if (skipFetch && providedOrders) {
      setOrders(providedOrders)
    }
  }, [providedOrders, skipFetch])

  // Abrir orden específica si viene en query params o initialOrderId
  useEffect(() => {
    if (typeof window === 'undefined') return
    const urlParams = new URLSearchParams(window.location.search)
    const orderIdToView = initialOrderId || urlParams.get('orderId')
    
    if (orderIdToView && orders.length > 0) {
      const orderToView = orders.find(o => o.id === orderIdToView)
      if (orderToView) {
        setSelectedOrder(orderToView)
        setShowOrderDetails(true)
      } else {
        // Si no se encuentra en la lista, cargarla directamente
        apiClient.get<OrderDTO>(API_ENDPOINTS.ORDERS.BY_ID(orderIdToView))
          .then(orderResponse => {
            if (orderResponse.success && orderResponse.data) {
              setSelectedOrder(orderResponse.data)
              setShowOrderDetails(true)
              setOrders(prev => {
                if (!prev.find(o => o.id === orderResponse.data!.id)) {
                  return [orderResponse.data!, ...prev]
                }
                return prev
              })
            }
          })
          .catch(error => {
            console.error('Error al cargar orden específica:', error)
          })
      }
    }
  }, [orders, initialOrderId])

  // Determinar si el usuario actual es el sender o receiver de la orden
  const isSender = (order: OrderDTO): boolean => {
    // Si la orden tiene información del StalkerGift, usar esa información
    if (order.stalkerGift) {
      return order.stalkerGift.senderId === user?.id
    }
    
    // Fallback: si no hay información del StalkerGift, usar lógica básica
    // Si el userId de la orden coincide con el usuario actual, es el receiver
    // Si no coincide, probablemente es el sender (aunque esto es menos preciso)
    return order.userId !== user?.id
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
      case 'pendiente':
        return <ClockIcon className="w-4 h-4 text-yellow-400" />
      case 'processing':
      case 'procesando':
      case 'confirmed':
      case 'confirmado':
        return <EyeIcon className="w-4 h-4 text-blue-400" />
      case 'shipped':
      case 'enviado':
        return <ShoppingBagIcon className="w-4 h-4 text-purple-400" />
      case 'delivered':
      case 'entregado':
        return <CheckCircleIcon className="w-4 h-4 text-green-400" />
      case 'cancelled':
      case 'cancelado':
        return <XCircleIcon className="w-4 h-4 text-red-400" />
      default:
        return <ClockIcon className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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

  /** Dropi / envío — mismos chips que OrdersTab (solo lectura si no hay webhook). */
  const getShipStatusColor = (status: string | null | undefined) => {
    if (!status) return 'bg-gray-900/30 text-gray-400 border-gray-500/30'
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

  const formatShipStatus = (status: string | null | undefined) => {
    if (!status) return 'Sin actualizar'
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

  const formatOrderStatusFriendly = (status: string) => {
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

  /**
   * "Regalo recibido" solo cuando el envío figura entregado (evita decir "recibido" antes de la entrega).
   * Antes: "Tu regalo" + estado pedido / Dropi.
   */
  const getReceiverCardTitle = (order: OrderDTO) => {
    const s = order.status?.toLowerCase() ?? ''
    if (s === 'delivered' || s === 'entregado') return 'Regalo recibido'
    return 'Tu regalo'
  }

  const openDetails = (order: OrderDTO) => {
    setSelectedOrder(order)
    setShowOrderDetails(true)
  }

  const scrollModalToRegalo = () => {
    modalRegaloRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const goChatsStalkerGift = () => {
    router.push('/stalkergift')
  }

  const displayedOrders = useMemo(() => {
    let list = orders
    if (timeRange) {
      const a = timeRange.start.getTime()
      const b = timeRange.end.getTime()
      list = list.filter((o) => {
        const t = new Date(o.createdAt).getTime()
        return t >= a && t <= b
      })
    }
    if (orderRole === 'sender') {
      list = list.filter((o) => isSender(o))
    } else if (orderRole === 'receiver') {
      list = list.filter((o) => !isSender(o))
    }
    return list
  }, [orders, timeRange, orderRole, user?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#73FFA2]"></div>
      </div>
    )
  }

  if (!loading && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Image
          src="/icons_tanku/tanku_logo_menu_stalkergift_verde.svg"
          alt=""
          width={52}
          height={52}
          className="mb-4 h-[52px] w-[52px] object-contain opacity-90"
          unoptimized
        />
        <h3 className="text-white text-lg font-medium mb-2">Aun no has hecho un regalo secreto</h3>
        <p className="text-gray-400 text-sm">Las órdenes de tus regalos aparecerán aquí.</p>
      </div>
    )
  }

  if (!loading && displayedOrders.length === 0 && orders.length > 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-gray-500">
        No hay órdenes en este período o segmento seleccionado.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {displayedOrders.map((order) => {
          const userIsSender = isSender(order)
          const firstLine = order.items[0]
          const dropiChip = firstLine?.dropiStatus
          const surfaceClass = `${userIsSender ? STALKERGIFT_SHELL_SENDER_BASE : STALKERGIFT_SHELL_RECEIVER_BASE} ${STALKERGIFT_ORDER_ROW_POINTER}`
          const receiverHeadline = getReceiverCardTitle(order)

          const thumbSrc = firstLine?.product?.images?.[0]
          const titleLine = firstLine?.product?.title ?? 'Regalo'

          return (
            <div
              key={order.id}
              className={`${surfaceClass} w-full max-w-full`}
              role="button"
              tabIndex={0}
              onClick={() => openDetails(order)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openDetails(order)
                }
              }}
            >
              <div className="flex w-full min-h-[5.25rem] flex-col gap-3 md:flex-row md:items-center md:gap-3">
                {/* Izquierda: miniatura + texto (banda horizontal) */}
                <div className="flex min-w-0 flex-1 items-start gap-3 md:items-center">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#252a32]">
                    {thumbSrc ? (
                      <Image
                        src={thumbSrc}
                        alt={titleLine}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <GiftIcon
                          className={`h-7 w-7 ${userIsSender ? 'text-[#66DEDB]/80' : 'text-[#73FFA2]/80'}`}
                        />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <GiftIcon
                        className={`h-4 w-4 shrink-0 sm:h-5 sm:w-5 ${userIsSender ? 'text-[#66DEDB]' : 'text-[#73FFA2]'}`}
                      />
                      <h3 className="min-w-0 truncate text-sm font-semibold text-white sm:text-base">
                        {userIsSender ? 'Regalo enviado' : receiverHeadline}
                      </h3>
                      {userIsSender ? (
                        <span
                          className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline-flex ${getStatusColor(order.status)}`}
                        >
                          {formatOrderStatusFriendly(order.status)}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-white/90 sm:text-sm" title={titleLine}>
                      {titleLine}
                    </p>
                    {!userIsSender ? (
                      <p className="mt-0.5 text-[11px] text-gray-500">
                        {receiverHeadline === 'Regalo recibido'
                          ? 'Entrega registrada en el sistema.'
                          : 'Seguimiento de pedido y envío cuando Dropi sincronice.'}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-gray-500 sm:text-xs">
                      Orden #{order.id.slice(0, 8)} · {formatDate(order.createdAt)}
                    </p>
                    {!userIsSender ? (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <span
                          className={`inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${getStatusColor(order.status)}`}
                        >
                          Pedido: {formatOrderStatusFriendly(order.status)}
                        </span>
                        {dropiChip ? (
                          <span
                            className={`inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${getShipStatusColor(dropiChip)}`}
                          >
                            Dropi: {formatShipStatus(dropiChip)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.04] px-2 py-0.5 text-[10px] text-gray-500">
                            Dropi sin dato aún
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="mt-1 line-clamp-1 text-[11px] text-gray-500">
                        Cant. {firstLine?.quantity ?? '—'} {order.items.length > 1 ? `· +${order.items.length - 1}` : ''}
                      </p>
                    )}
                  </div>
                </div>

                {/* Total envío · solo pagador */}
                {userIsSender ? (
                  <div className="flex shrink-0 flex-col justify-center rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-right md:border-0 md:bg-transparent md:px-2 md:py-0">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Total</span>
                    <span className="text-base font-bold tabular-nums text-[#66DEDB] sm:text-lg">
                      {formatPrice(order.total)}
                    </span>
                    <span
                      className={`mt-1 inline-flex justify-end rounded-full px-2 py-0.5 text-[10px] font-medium md:hidden ${getStatusColor(order.status)}`}
                    >
                      {formatOrderStatusFriendly(order.status)}
                    </span>
                  </div>
                ) : null}

                {/* Acciones: mismos anchos compactos por fila */}
                <div
                  className="flex w-full shrink-0 flex-col gap-2 border-t border-white/[0.08] pt-3 sm:w-auto sm:border-t-0 md:min-w-[10.25rem] md:border-l md:border-white/[0.08] md:pl-3 md:pt-0"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-col sm:gap-1.5">
                    <button
                      type="button"
                      className={`${STALKERGIFT_BTN_SECONDARY_INLINE} w-full`}
                      onClick={() => goChatsStalkerGift()}
                    >
                      <ChatBubbleLeftIcon className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                      Mensaje
                    </button>
                    <button
                      type="button"
                      className={`${STALKERGIFT_BTN_SECONDARY_INLINE} w-full`}
                      onClick={() => openDetails(order)}
                    >
                      <EyeIcon className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                      Detalle
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal: quien envía no ve dirección · quien recibe no ve precios */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/50 p-4">
          <div
            className={`max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-[#171B21] shadow-2xl ${
              isSender(selectedOrder)
                ? 'border-[#66DEDB]/35 ring-1 ring-[#66DEDB]/12'
                : 'border-[#73FFA2]/35 ring-1 ring-[#73FFA2]/14'
            }`}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#171B21]/95 px-4 py-3 backdrop-blur">
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <GiftIcon
                  className={`h-6 w-6 ${isSender(selectedOrder) ? 'text-[#66DEDB]' : 'text-[#73FFA2]'}`}
                />
                Detalle del regalo
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowOrderDetails(false)
                  setSelectedOrder(null)
                  setSelectedItemForWebhook(null)
                }}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-5 p-4 sm:p-6">
              <div
                className={
                  !isSender(selectedOrder) && selectedOrder.address
                    ? 'grid gap-4 md:grid-cols-2 md:items-start md:gap-6'
                    : 'grid grid-cols-1 gap-4'
                }
              >
                <div>
                  <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Información
                  </h3>
                  <div className="space-y-2 rounded-lg bg-black/25 p-3 text-sm ring-1 ring-white/[0.06]">
                    <div className="flex justify-between gap-3">
                      <span className="shrink-0 text-gray-400">ID</span>
                      <span className="break-all text-right font-mono text-xs text-white">{selectedOrder.id}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-400">Estado del pedido</span>
                      <span
                        className={`px-2 py-0.5 text-xs capitalize ${getStatusColor(selectedOrder.status)}`}
                      >
                        {formatOrderStatusFriendly(selectedOrder.status)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-400">Fecha</span>
                      <span className="text-white">{formatDate(selectedOrder.createdAt)}</span>
                    </div>
                    {selectedOrder.stalkerGift && !isSender(selectedOrder) && (
                      <div className="flex justify-between gap-3 border-t border-white/[0.06] pt-2">
                        <span className="text-gray-400">Alias remitente</span>
                        <span className="text-right text-white">{selectedOrder.stalkerGift.senderAlias}</span>
                      </div>
                    )}
                    {!isSender(selectedOrder) && selectedOrder.items[0]?.dropiStatus && (
                      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/[0.06] pt-2">
                        <span className="text-gray-400">Envío Dropi</span>
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${getShipStatusColor(selectedOrder.items[0].dropiStatus)}`}
                        >
                          {formatShipStatus(selectedOrder.items[0].dropiStatus)}
                        </span>
                      </div>
                    )}
                    {isSender(selectedOrder) && (
                      <>
                        <div className="flex justify-between gap-3 border-t border-white/[0.06] pt-2">
                          <span className="text-gray-400">Método de pago</span>
                          <span className="text-right text-white">{selectedOrder.paymentMethod}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-gray-400">Subtotal</span>
                          <span className="text-white">{formatPrice(selectedOrder.subtotal)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-gray-400">Envío</span>
                          <span className="text-white">{formatPrice(selectedOrder.shippingTotal)}</span>
                        </div>
                        <div className="flex justify-between gap-3 border-t border-[#66DEDB]/20 pt-2">
                          <span className="font-medium text-gray-200">Total</span>
                          <span className="text-lg font-bold text-[#66DEDB]">
                            {formatPrice(selectedOrder.total)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {!isSender(selectedOrder) && selectedOrder.address ? (
                  <div>
                    <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Dirección de envío
                    </h3>
                    <div className="space-y-1.5 rounded-lg bg-black/25 p-3 text-sm text-gray-200 ring-1 ring-white/[0.06]">
                      <p className="font-medium text-white">
                        {selectedOrder.address.firstName} {selectedOrder.address.lastName}
                      </p>
                      <p>{selectedOrder.address.address1}</p>
                      {selectedOrder.address.address2 && <p>{selectedOrder.address.address2}</p>}
                      <p>
                        {selectedOrder.address.city}, {selectedOrder.address.state}{' '}
                        {selectedOrder.address.postalCode}
                      </p>
                      {selectedOrder.address.phone && <p className="pt-1 text-gray-400">Tel: {selectedOrder.address.phone}</p>}
                    </div>
                  </div>
                ) : null}
              </div>

              <div ref={modalRegaloRef} id="stalkergift-order-modal-regalo" className="scroll-mt-28">
                <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Regalo
                </h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex gap-4 rounded-lg bg-black/25 p-3 ring-1 ring-white/[0.06]">
                      {item.product.images && item.product.images.length > 0 && (
                        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg">
                          <Image
                            src={item.product.images[0]}
                            alt={item.product.title}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-white">{item.product.title}</h4>
                        {item.variant && (
                          <p className="text-sm text-gray-400">Detalle: {item.variant.title}</p>
                        )}
                        <p className="text-sm text-gray-400">Cantidad: {item.quantity}</p>
                        {isSender(selectedOrder) && item.finalPrice && (
                          <p className="mt-1 text-sm font-medium text-[#66DEDB]">
                            {formatPrice(item.finalPrice * item.quantity)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Barra fija dentro del modal: mismos CTAs que en la fila (horizontal en desktop si cabe). */}
              <div className="sticky bottom-0 z-[2] mt-6 flex flex-col gap-2 border-t border-white/10 bg-[#171B21]/98 py-4 backdrop-blur-sm sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className={`${STALKERGIFT_BTN_SECONDARY_INLINE} w-full justify-center sm:w-auto sm:min-w-[9rem]`}
                  onClick={goChatsStalkerGift}
                >
                  <ChatBubbleLeftIcon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  Mensaje
                </button>
                <button
                  type="button"
                  className={`${STALKERGIFT_BTN_SECONDARY_INLINE} w-full justify-center sm:w-auto sm:min-w-[9rem]`}
                  onClick={scrollModalToRegalo}
                >
                  <EyeIcon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  Ver regalo / artículo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
