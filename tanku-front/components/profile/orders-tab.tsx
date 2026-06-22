'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { OrderDTO } from '@/types/api'
import { XMarkIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import { isRemoteImageSrc } from '@/lib/utils/remote-image'
import { NOTIFICATION_ROW_DIVIDER_STYLE } from '@/lib/notifications-display'
import { isDateInRange } from '@/lib/utils/mis-tankus-period'
import { OrderSupportSection } from '@/components/profile/order-support-section'
import { OrderItemDropiShippingModal } from '@/components/profile/order-item-dropi-shipping-modal'
import { OrderItemDropiShippingActions } from '@/components/profile/order-item-dropi-shipping-actions'
import { ProfileTabletOverlayModal } from '@/components/profile/profile-tablet-overlay-modal'
import { displayOrderRef } from '@/lib/utils/entity-ref-display'
import { dropiStatusChipClass, formatDropiStatus } from '@/lib/dropi-status'
import { clearProfileDeepLinkParams } from '@/lib/support-case-navigation'
import { belongsInPurchasesList } from '@/lib/order-list-segment'
import type { SupportCaseDetailDTO } from '@/types/api'

/** Superficie alineada con el panel de notificaciones del nav */
const ORDER_SURFACE_CLASS =
  'rounded-xl border border-[#414141] shadow-xl bg-[#171B21]'

interface OrdersTabProps {
  userId?: string
  /** Deep link postventa: ?case= */
  initialOpenCaseId?: string | null
  /** Tras checkout: ?orderId= (solo si no hay ?case) */
  checkoutOrderId?: string | null
  /** Filtra pedidos por `createdAt` dentro del rango (inclusive). */
  timeRange?: { start: Date; end: Date }
}

/** Total mostrado: alineado con suma de líneas (y con subtotal del backend si aplica). */
function getLineItemsSum(order: OrderDTO): number {
  return order.items.reduce((acc, item) => {
    const unit = item.finalPrice ?? item.final_price ?? item.price
    return acc + unit * item.quantity
  }, 0)
}

function getDisplayedOrderAmount(order: OrderDTO): number {
  const lines = getLineItemsSum(order)
  if (lines > 0) return lines
  if (typeof order.subtotal === 'number' && order.subtotal > 0) return order.subtotal
  return order.total
}

/** Evita mostrar slugs crudos como not_paid cuando es contra entrega. */
function formatPaymentSummary(order: OrderDTO): string {
  const pm = (order.paymentMethod || '').toLowerCase()
  const ps = (order.paymentStatus || '').toLowerCase()

  if (pm === 'cash_on_delivery') {
    if (ps === 'paid' || ps === 'completed' || ps === 'captured') {
      return 'Contra entrega · cobrado'
    }
    return 'Contra entrega'
  }

  const paidOk = ['paid', 'completed', 'captured', 'authorized'].some((x) => ps.includes(x))
  if (paidOk) return 'Pagado'

  if (ps === 'not_paid' || ps === 'awaiting' || ps === 'pending') {
    return pm === 'epayco' ? 'Pago pendiente (en línea)' : 'Pago pendiente'
  }

  return ps.replace(/_/g, ' ')
}

function OrderPurchaseCard({
  order,
  onViewDetails,
  formatDate,
  formatPrice,
}: {
  order: OrderDTO
  onViewDetails: (o: OrderDTO) => void
  formatDate: (s: string) => string
  formatPrice: (n: number) => string
}) {
  return (
    <div className={`overflow-hidden ${ORDER_SURFACE_CLASS}`}>
      <div
        className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2.5 sm:gap-3 sm:px-4"
        style={NOTIFICATION_ROW_DIVIDER_STYLE}
      >
        <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
          <div>
            <span className="block text-[9px] font-medium uppercase tracking-wide text-gray-500">
              Pedido realizado
            </span>
            <span className="text-sm text-gray-100">{formatDate(order.createdAt)}</span>
          </div>
          <div>
            <span className="block text-[9px] font-medium uppercase tracking-wide text-gray-500">
              N.º pedido
            </span>
            <span className="font-mono text-sm text-[#66DEDB]">{displayOrderRef(order)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onViewDetails(order)}
          className="shrink-0 text-xs font-medium text-[#73FFA2] hover:text-[#66DEDB]"
        >
          Ver detalle
        </button>
      </div>

      <div className="px-3 py-3 sm:px-4">
        <div className="space-y-0 divide-y divide-[#414141]/80">
          {order.items.map((item) => {
            const unit = item.finalPrice ?? item.final_price ?? item.price
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
                      <div className="flex h-full items-center justify-center text-[9px] text-gray-600">
                        —
                      </div>
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
                      <span className="shrink-0 text-sm font-semibold text-white tabular-nums">
                        {formatPrice(lineTotal)}
                      </span>
                    </div>
                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${dropiStatusChipClass(item.dropiStatus)}`}
                      >
                        Envío: {formatDropiStatus(item.dropiStatus)}
                      </span>
                    </div>
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

export function OrdersTab({
  userId,
  initialOpenCaseId = null,
  checkoutOrderId = null,
  timeRange,
}: OrdersTabProps) {
  const [orders, setOrders] = useState<OrderDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<OrderDTO | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [selectedItemForWebhook, setSelectedItemForWebhook] = useState<string | null>(null)
  const [deepLinkSupportCaseId, setDeepLinkSupportCaseId] = useState<string | null>(null)

  const checkoutDeepLinkHandledRef = React.useRef<string | null>(null)
  const supportCaseDeepLinkHandledRef = React.useRef<string | null>(null)

  useEffect(() => {
    if (!initialOpenCaseId) supportCaseDeepLinkHandledRef.current = null
  }, [initialOpenCaseId])

  useEffect(() => {
    if (!checkoutOrderId) checkoutDeepLinkHandledRef.current = null
  }, [checkoutOrderId])

  const handleSupportDeepLinkConsumed = useCallback(() => {
    setDeepLinkSupportCaseId(null)
    clearProfileDeepLinkParams()
  }, [])

  const openOrderById = useCallback(
    async (orderIdToView: string) => {
      const existing = orders.find((o) => o.id === orderIdToView)
      if (existing) {
        setSelectedOrder(existing)
        setShowOrderDetails(true)
        return
      }

      const orderResponse = await apiClient.get<OrderDTO>(
        API_ENDPOINTS.ORDERS.BY_ID(orderIdToView)
      )
      if (orderResponse.success && orderResponse.data) {
        setSelectedOrder(orderResponse.data)
        setShowOrderDetails(true)
        if (belongsInPurchasesList(orderResponse.data)) {
          setOrders((prev) => {
            if (!prev.find((o) => o.id === orderResponse.data!.id)) {
              return [orderResponse.data!, ...prev]
            }
            return prev
          })
        }
      }
    },
    [orders]
  )

  const loadOrders = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get<{ orders: OrderDTO[]; total: number; hasMore: boolean }>(
        API_ENDPOINTS.ORDERS.LIST
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
      console.error('Error al cargar órdenes:', error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      loadOrders()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Deep link postventa (?case=): una sola vez por id de caso
  useEffect(() => {
    if (!initialOpenCaseId) return
    if (supportCaseDeepLinkHandledRef.current === initialOpenCaseId) return

    let cancelled = false

    void (async () => {
      try {
        const caseResponse = await apiClient.get<SupportCaseDetailDTO>(
          API_ENDPOINTS.SUPPORT_CASES.BY_ID(initialOpenCaseId)
        )
        if (cancelled || !caseResponse.success || !caseResponse.data) return

        supportCaseDeepLinkHandledRef.current = initialOpenCaseId
        await openOrderById(caseResponse.data.orderId)
        if (cancelled) return

        setDeepLinkSupportCaseId(initialOpenCaseId)
        clearProfileDeepLinkParams()
      } catch (error) {
        console.error('Error al abrir caso de soporte desde notificación:', error)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [initialOpenCaseId, openOrderById])

  // Tras checkout (?orderId= sin ?case): abrir pedido una vez y limpiar URL
  useEffect(() => {
    if (!checkoutOrderId || initialOpenCaseId) return
    if (loading) return
    if (checkoutDeepLinkHandledRef.current === checkoutOrderId) return

    checkoutDeepLinkHandledRef.current = checkoutOrderId
    void openOrderById(checkoutOrderId).finally(() => {
      clearProfileDeepLinkParams()
    })
  }, [checkoutOrderId, initialOpenCaseId, loading, openOrderById])

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

  const handleViewOrder = (order: OrderDTO) => {
    setSelectedOrder(order)
    setShowOrderDetails(true)
  }

  const closeOrderDetails = () => {
    setSelectedOrder(null)
    setShowOrderDetails(false)
    setSelectedItemForWebhook(null)
  }

  const handleViewWebhookData = (itemId: string) => {
    setSelectedItemForWebhook(itemId)
  }

  const closeWebhookModal = () => {
    setSelectedItemForWebhook(null)
  }

  const visibleOrders = useMemo(() => {
    if (!timeRange) return orders
    return orders.filter((o) => isDateInRange(o.createdAt, timeRange))
  }, [orders, timeRange])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#73FFA2]"></div>
        <span className="ml-2 text-white">Cargando órdenes...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Image
            src="/icons_tanku/tanku_nav_carrito_verde.svg"
            alt=""
            width={46}
            height={46}
            className="mb-3 h-[46px] w-[46px] object-contain opacity-80"
            unoptimized
          />
          <h4 className="text-white text-lg font-medium mb-2">Aun no has comprado nada</h4>
          <p className="text-gray-400 text-sm">Cuando realices compras, aparecerán aquí.</p>
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Image
            src="/icons_tanku/tanku_nav_carrito_verde.svg"
            alt=""
            width={46}
            height={46}
            className="mb-3 h-[46px] w-[46px] object-contain opacity-60"
            unoptimized
          />
          <h4 className="mb-2 text-lg font-medium text-white">Sin compras en este período</h4>
          <p className="text-sm text-gray-400">Prueba otro rango de fechas en el selector de período.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleOrders.map((order) => (
            <OrderPurchaseCard
              key={order.id}
              order={order}
              onViewDetails={handleViewOrder}
              formatDate={formatDate}
              formatPrice={formatPrice}
            />
          ))}
        </div>
      )}

      {showOrderDetails && selectedOrder && (
        <ProfileTabletOverlayModal
          open
          onClose={closeOrderDetails}
          titleId="order-details-title"
          mobileLayout="dialog"
          mobileBackdrop="blur"
          maxWidthClass="max-w-lg"
          panelHeightClass="h-auto max-md:max-h-[min(46rem,93dvh)] md:max-h-[min(44rem,90vh)]"
          panelClassName="flex flex-col min-h-0"
        >
            <div
              className="flex shrink-0 items-center justify-between border-b px-4 py-3 bg-[#171B21]"
              style={NOTIFICATION_ROW_DIVIDER_STYLE}
            >
              <h3 id="order-details-title" className="text-base font-semibold text-white">
                Pedido <span className="text-[#66DEDB]">{displayOrderRef(selectedOrder)}</span>
              </h3>
              <button
                type="button"
                onClick={closeOrderDetails}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                aria-label="Cerrar"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pt-4 pb-3">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-[#414141]/90 bg-black/20 p-3">
                  <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Información del pedido
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="shrink-0 text-gray-500">Fecha</span>
                      <span className="text-right text-gray-200">{formatDate(selectedOrder.createdAt)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="shrink-0 text-gray-500">Total</span>
                      <span className="text-right font-medium text-white">
                        {formatPrice(getDisplayedOrderAmount(selectedOrder))}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="shrink-0 text-gray-500">Pago</span>
                      <span className="text-right text-gray-200">{formatPaymentSummary(selectedOrder)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="shrink-0 text-gray-500">Método</span>
                      <span className="text-right text-gray-200">
                        {selectedOrder.paymentMethod === 'cash_on_delivery'
                          ? 'Contra entrega'
                          : selectedOrder.paymentMethod === 'epayco'
                            ? 'En línea (ePayco)'
                            : selectedOrder.paymentMethod}
                      </span>
                    </div>
                    <p className="border-t border-[#414141]/60 pt-2 text-[11px] leading-relaxed text-gray-500">
                      El envío de cada artículo puede variar. Revisa el estado por producto abajo.
                    </p>
                  </div>
                </div>

                {selectedOrder.address && (
                  <div className="rounded-lg border border-[#414141]/90 bg-black/20 p-3">
                    <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Envío</h4>
                    <div className="text-sm text-gray-300">
                      <div>
                        {selectedOrder.address.firstName} {selectedOrder.address.lastName}
                      </div>
                      <div>{selectedOrder.address.address1}</div>
                      {selectedOrder.address.address2 && <div>{selectedOrder.address.address2}</div>}
                      <div>
                        {selectedOrder.address.city}, {selectedOrder.address.state}
                      </div>
                      <div>{selectedOrder.address.postalCode}</div>
                      <div>{selectedOrder.address.phone}</div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h4 className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">Productos</h4>
                <div className="space-y-0 divide-y divide-[#414141]/80 rounded-lg border border-[#414141]/90 bg-black/20 px-3 py-3 sm:px-4">
                  {selectedOrder.items.map((item) => {
                    const finalPrice = item.finalPrice || item.final_price || item.price
                    const totalPrice = finalPrice * item.quantity
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
                              <div className="flex h-full items-center justify-center text-[9px] text-gray-600">
                                —
                              </div>
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
                              <span className="shrink-0 text-sm font-semibold tabular-nums text-white">
                                {formatPrice(totalPrice)}
                              </span>
                            </div>
                            <div className="mt-2">
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${dropiStatusChipClass(item.dropiStatus)}`}
                              >
                                Envío: {formatDropiStatus(item.dropiStatus)}
                              </span>
                            </div>
                            <OrderItemDropiShippingActions
                              item={item}
                              onViewShipping={() => handleViewWebhookData(item.id)}
                              className="mt-1.5"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              </div>

              <OrderSupportSection
                order={selectedOrder}
                variant="footer"
                initialOpenSupportCaseId={deepLinkSupportCaseId}
                onSupportDeepLinkConsumed={handleSupportDeepLinkConsumed}
              />
            </div>
        </ProfileTabletOverlayModal>
      )}

      {selectedOrder && selectedItemForWebhook ? (
        <OrderItemDropiShippingModal
          open
          onClose={closeWebhookModal}
          orderItemId={selectedItemForWebhook}
          productTitle={
            selectedOrder.items.find((i) => i.id === selectedItemForWebhook)?.product.title ??
            'Producto'
          }
          tankuDropiStatus={
            selectedOrder.items.find((i) => i.id === selectedItemForWebhook)?.dropiStatus
          }
          dropiWebhookData={
            selectedOrder.items.find((i) => i.id === selectedItemForWebhook)?.dropiWebhookData
          }
        />
      ) : null}
    </div>
  )
}
