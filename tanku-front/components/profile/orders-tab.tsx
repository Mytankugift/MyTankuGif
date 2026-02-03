'use client'

import React, { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { OrderDTO } from '@/types/api'
import { ShoppingBagIcon, CheckCircleIcon, XCircleIcon, ClockIcon, EyeIcon, XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import { useAuthStore } from '@/lib/stores/auth-store'

interface OrdersTabProps {
  userId?: string
  initialOrderId?: string | null
}

export function OrdersTab({ userId, initialOrderId }: OrdersTabProps) {
  const { user } = useAuthStore()
  const [orders, setOrders] = useState<OrderDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<OrderDTO | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [selectedItemForWebhook, setSelectedItemForWebhook] = useState<string | null>(null)

  const loadOrders = async () => {
    try {
      setLoading(true)
      // El backend devuelve { orders: OrderDTO[], total: number, hasMore: boolean }
      const response = await apiClient.get<{ orders: OrderDTO[]; total: number; hasMore: boolean }>(
        API_ENDPOINTS.ORDERS.LIST
      )
      
      if (response.success && response.data) {
        // El backend devuelve un objeto con orders, total y hasMore
        if (response.data && typeof response.data === 'object' && 'orders' in response.data) {
          setOrders(Array.isArray(response.data.orders) ? response.data.orders : [])
        } else if (Array.isArray(response.data)) {
          // Fallback: si viene como array directo
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

  // Cargar órdenes cuando el componente se monta
  useEffect(() => {
    if (userId) {
      loadOrders()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

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
              // Agregar la orden a la lista si no estaba
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

  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'Pendiente',
      'paid': 'Pagado',
      'processing': 'Procesando',
      'confirmed': 'Confirmado',
      'shipped': 'Enviado',
      'delivered': 'Entregado',
      'cancelled': 'Cancelado',
    }
    return statusMap[status.toLowerCase()] || status
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

  const getDropiStatusColor = (status: string | null | undefined) => {
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

  const formatDropiStatus = (status: string | null | undefined) => {
    if (!status) return 'Sin estado'
    const statusMap: Record<string, string> = {
      'PENDING': 'Pendiente',
      'PROCESSING': 'En proceso',
      'SHIPPED': 'Enviado',
      'DELIVERED': 'Entregado',
      'CANCELLED': 'Cancelado',
      'REJECTED': 'Rechazado',
    }
    return statusMap[status.toUpperCase()] || status
  }

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
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <ShoppingBagIcon className="w-6 h-6 text-[#73FFA2]" />
        <h3 className="text-xl font-bold text-[#73FFA2]">MIS COMPRAS</h3>
      </div>

      {/* Orders Table */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <ShoppingBagIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-white text-lg font-medium mb-2">No hay órdenes</h4>
          <p className="text-gray-400 text-sm">Cuando realices compras, aparecerán aquí.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-700">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#73FFA2] uppercase tracking-wider">
                    Orden
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#73FFA2] uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#73FFA2] uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#73FFA2] uppercase tracking-wider">
                    Pago
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#73FFA2] uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#73FFA2] uppercase tracking-wider">
                    Productos
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#73FFA2] uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-900 divide-y divide-gray-700">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        #{order.id.slice(-8).toUpperCase()}
                      </div>
                      <div className="text-sm text-gray-400">
                        {order.email}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        {formatStatus(order.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.paymentStatus)}`}>
                        {getStatusIcon(order.paymentStatus)}
                        {formatStatus(order.paymentStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                      {order.items.length} producto(s)
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleViewOrder(order)}
                        className="text-[#73FFA2] hover:text-[#66DEDB] transition-colors flex items-center gap-1"
                      >
                        <EyeIcon className="w-4 h-4" />
                        Ver detalles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4 p-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-sm font-medium text-white">
                      #{order.id.slice(-8).toUpperCase()}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatDate(order.createdAt)}
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    {formatStatus(order.status)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center mb-3">
                  <div className="text-sm text-gray-300">
                    {order.items.length} producto(s)
                  </div>
                  <div className="text-sm font-medium text-white">
                    {formatPrice(order.total)}
                  </div>
                </div>

                <button
                  onClick={() => handleViewOrder(order)}
                  className="w-full bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] text-gray-900 px-4 py-2 rounded-lg font-medium text-sm hover:from-[#73FFA2] hover:to-[#66DEDB] transition-all flex items-center justify-center gap-2"
                >
                  <EyeIcon className="w-4 h-4" />
                  Ver detalles
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={closeOrderDetails}>
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-[#73FFA2]">
                  Detalles de la Orden #{selectedOrder.id.slice(-8).toUpperCase()}
                </h3>
                <button
                  onClick={closeOrderDetails}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Order Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-medium text-[#73FFA2] mb-2">Información de la Orden</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Fecha:</span>
                      <span className="text-white">{formatDate(selectedOrder.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Estado:</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedOrder.status)}`}>
                        {getStatusIcon(selectedOrder.status)}
                        {formatStatus(selectedOrder.status)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Estado de Pago:</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedOrder.paymentStatus)}`}>
                        {getStatusIcon(selectedOrder.paymentStatus)}
                        {formatStatus(selectedOrder.paymentStatus)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total:</span>
                      {/* ✅ El total real es el subtotal (el envío ya está incluido) */}
                      <span className="text-white font-medium">{formatPrice(selectedOrder.subtotal)}</span>
                    </div>
                    {/* ❌ ELIMINAR Subtotal y Envío - no deben mostrarse */}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Método de Pago:</span>
                      {/* ✅ Convertir cash_on_delivery a "Contraentrega" y epayco a "Epayco" */}
                      <span className="text-white">
                        {selectedOrder.paymentMethod === 'cash_on_delivery' 
                          ? 'Contraentrega' 
                          : selectedOrder.paymentMethod === 'epayco' 
                          ? 'Epayco' 
                          : selectedOrder.paymentMethod}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedOrder.address && (
                  <div>
                    <h4 className="text-sm font-medium text-[#73FFA2] mb-2">Dirección de Envío</h4>
                    <div className="text-sm text-gray-300">
                      <div>{selectedOrder.address.firstName} {selectedOrder.address.lastName}</div>
                      <div>{selectedOrder.address.address1}</div>
                      {selectedOrder.address.address2 && <div>{selectedOrder.address.address2}</div>}
                      <div>{selectedOrder.address.city}, {selectedOrder.address.state}</div>
                      <div>{selectedOrder.address.postalCode}</div>
                      <div>{selectedOrder.address.phone}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div>
                <h4 className="text-sm font-medium text-[#73FFA2] mb-4">Productos</h4>
                <div className="space-y-3">
                  {selectedOrder.items.map((item) => {
                    const finalPrice = item.finalPrice || item.final_price || item.price
                    const totalPrice = finalPrice * item.quantity

                    return (
                      <div key={item.id} className="p-3 bg-gray-800 rounded-lg space-y-2">
                        <div className="flex gap-3">
                          {/* Product Image */}
                          <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-700 relative">
                            {item.product.images && item.product.images.length > 0 ? (
                              <Image
                                src={item.product.images[0]}
                                alt={item.product.title}
                                fill
                                className="object-cover"
                                sizes="80px"
                                unoptimized={item.product.images[0]?.includes('cloudfront.net') || item.product.images[0]?.includes('.gif')}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                                Sin imagen
                              </div>
                            )}
                          </div>
                          
                          {/* Product Info */}
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="text-sm font-medium text-white">
                                  {item.product.title}
                                </div>
                                {item.variant.title && (
                                  <div className="text-xs text-gray-400 mt-1">
                                    {item.variant.title}
                                  </div>
                                )}
                                <div className="text-xs text-gray-400 mt-1">
                                  Cantidad: {item.quantity} × {formatPrice(finalPrice)}
                                </div>
                                {/* Estado de Dropi */}
                                {item.dropiStatus && (
                                  <div className="mt-2">
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getDropiStatusColor(item.dropiStatus)}`}>
                                      Estado de envío: {formatDropiStatus(item.dropiStatus)}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-white">
                                  {formatPrice(totalPrice)}
                                </div>
                                {/* Botón para ver payload del webhook */}
                                {(item.dropiOrderId || item.dropiWebhookData) && (
                                  <button
                                    onClick={() => handleViewWebhookData(item.id)}
                                    className="mt-2 text-xs text-[#73FFA2] hover:text-[#66DEDB] transition-colors flex items-center gap-1"
                                    title="Ver datos del webhook de Dropi"
                                  >
                                    <InformationCircleIcon className="w-4 h-4" />
                                    Ver estado de envío
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para mostrar payload del webhook de Dropi */}
      {showOrderDetails && selectedOrder && selectedItemForWebhook && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50" onClick={closeWebhookModal}>
          <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-[#73FFA2]">
                  Estado de Envío - {selectedOrder.items.find(i => i.id === selectedItemForWebhook)?.product.title || 'Producto'}
                </h3>
                <button
                  onClick={closeWebhookModal}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {(() => {
                const item = selectedOrder.items.find(i => i.id === selectedItemForWebhook)
                if (!item) return null

                const webhookData = item.dropiWebhookData
                const hasData = webhookData && Object.keys(webhookData).length > 0

                return (
                  <div className="space-y-4">
                    {/* Información básica */}
                    <div className="bg-gray-800 rounded-lg p-4 space-y-2">
                      <h4 className="text-sm font-medium text-[#73FFA2] mb-3">Información del Producto</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Estado:</span>
                          <span className={`ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getDropiStatusColor(item.dropiStatus)}`}>
                            {formatDropiStatus(item.dropiStatus)}
                          </span>
                        </div>
                        {/* ❌ ELIMINAR ID de Dropi, Costo de envío y Ganancia del dropshipper */}
                        
                        {/* ✅ Mostrar link a la guía cuando existe (mantener incluso si cambia el estado) */}
                        {webhookData?.shipping_guide && webhookData?.shipping_company && webhookData?.sticker && (
                          <div className="col-span-2">
                            <span className="text-gray-400">Guía de envío:</span>
                            <a
                              href={`${process.env.NEXT_PUBLIC_DROPI_API_URL || 'https://api.dropi.co'}/guias/${webhookData.shipping_company.toLowerCase()}/${webhookData.sticker}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-[#73FFA2] hover:text-[#66DEDB] underline"
                            >
                              Ver guía de envío
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Payload del webhook - Solo para cuenta de test */}
                    {/* ✅ Ocultar payload completo o solo mostrarlo para cuenta de test */}
                    {(process.env.NEXT_PUBLIC_ENABLE_DROPI_WEBHOOK_DEBUG === 'true' || user?.email?.includes('test')) && (
                      <div className="bg-gray-800 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-[#73FFA2] mb-3">Payload Completo del Webhook de Dropi</h4>
                        {hasData ? (
                          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                            <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words">
                              {JSON.stringify(webhookData, null, 2)}
                            </pre>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400 text-center py-8">
                            No hay datos del webhook disponibles aún. Los datos aparecerán aquí cuando Dropi envíe actualizaciones de estado.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
