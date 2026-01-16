'use client'

import React, { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { OrderDTO } from '@/types/api'
import { useAuthStore } from '@/lib/stores/auth-store'
import { ShoppingBagIcon, CheckCircleIcon, XCircleIcon, ClockIcon, EyeIcon, XMarkIcon, GiftIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

interface StalkerGiftOrdersTabProps {
  userId?: string
  initialOrderId?: string | null
}

export function StalkerGiftOrdersTab({ userId, initialOrderId }: StalkerGiftOrdersTabProps) {
  const { user } = useAuthStore()
  const [orders, setOrders] = useState<OrderDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<OrderDTO | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [selectedItemForWebhook, setSelectedItemForWebhook] = useState<string | null>(null)

  const loadOrders = async () => {
    try {
      setLoading(true)
      // Cargar órdenes de StalkerGift (tanto enviadas como recibidas)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#73FFA2]"></div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <GiftIcon className="w-16 h-16 text-gray-600 mb-4" />
        <h3 className="text-white text-lg font-medium mb-2">No hay órdenes de StalkerGift</h3>
        <p className="text-gray-400 text-sm">Las órdenes de tus regalos aparecerán aquí.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {orders.map((order) => {
          const userIsSender = isSender(order)
          
          return (
            <div
              key={order.id}
              className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors cursor-pointer"
              onClick={() => {
                setSelectedOrder(order)
                setShowOrderDetails(true)
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <GiftIcon className="w-5 h-5 text-[#73FFA2]" />
                    <h3 className="text-white font-semibold">
                      {userIsSender ? 'Regalo enviado' : 'Regalo recibido'}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-400">Orden #{order.id.slice(0, 8)}</p>
                  <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                  {order.status}
                </div>
              </div>

              <div className="space-y-2">
                {order.items.slice(0, 2).map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    {item.product.images && item.product.images.length > 0 && (
                      <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
                        <Image
                          src={item.product.images[0]}
                          alt={item.product.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{item.product.title}</p>
                      <p className="text-xs text-gray-400">Cantidad: {item.quantity}</p>
                      {/* Mostrar precio solo si es sender */}
                      {userIsSender && item.finalPrice && (
                        <p className="text-xs text-[#73FFA2] font-medium">
                          {formatPrice(item.finalPrice * item.quantity)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {order.items.length > 2 && (
                  <p className="text-xs text-gray-400">+{order.items.length - 2} producto(s) más</p>
                )}
              </div>

              {/* Mostrar total solo si es sender */}
              {userIsSender && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Total</span>
                    <span className="text-lg font-bold text-[#73FFA2]">
                      {formatPrice(order.total)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal de detalles (simplificado - similar a OrdersTab pero con filtros de privacidad) */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <GiftIcon className="w-6 h-6 text-[#73FFA2]" />
                Detalles de la orden
              </h2>
              <button
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

            <div className="p-6 space-y-6">
              {/* Información de la orden */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Información de la orden</h3>
                <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">ID:</span>
                    <span className="text-white font-mono text-sm">{selectedOrder.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Estado:</span>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(selectedOrder.status)}`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Fecha:</span>
                    <span className="text-white">{formatDate(selectedOrder.createdAt)}</span>
                  </div>
                  {/* Mostrar método de pago y total solo si es sender */}
                  {isSender(selectedOrder) && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Método de pago:</span>
                        <span className="text-white">{selectedOrder.paymentMethod}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Subtotal:</span>
                        <span className="text-white">{formatPrice(selectedOrder.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Envío:</span>
                        <span className="text-white">{formatPrice(selectedOrder.shippingTotal)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-600">
                        <span className="text-gray-300 font-medium">Total:</span>
                        <span className="text-[#73FFA2] font-bold text-lg">
                          {formatPrice(selectedOrder.total)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Productos */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Productos</h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="bg-gray-700/50 rounded-lg p-4 flex gap-4">
                      {item.product.images && item.product.images.length > 0 && (
                        <div className="relative w-20 h-20 rounded overflow-hidden flex-shrink-0">
                          <Image
                            src={item.product.images[0]}
                            alt={item.product.title}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="text-white font-medium">{item.product.title}</h4>
                        {item.variant && (
                          <p className="text-sm text-gray-400">Variante: {item.variant.title}</p>
                        )}
                        <p className="text-sm text-gray-400">Cantidad: {item.quantity}</p>
                        {/* Mostrar precio solo si es sender */}
                        {isSender(selectedOrder) && item.finalPrice && (
                          <p className="text-sm text-[#73FFA2] font-medium mt-1">
                            {formatPrice(item.finalPrice * item.quantity)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dirección de envío - solo visible para receiver */}
              {!isSender(selectedOrder) && selectedOrder.address && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Dirección de envío</h3>
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <p className="text-white">
                      {selectedOrder.address.firstName} {selectedOrder.address.lastName}
                    </p>
                    <p className="text-gray-300">{selectedOrder.address.address1}</p>
                    {selectedOrder.address.address2 && (
                      <p className="text-gray-300">{selectedOrder.address.address2}</p>
                    )}
                    <p className="text-gray-300">
                      {selectedOrder.address.city}, {selectedOrder.address.state} {selectedOrder.address.postalCode}
                    </p>
                    {selectedOrder.address.phone && (
                      <p className="text-gray-300 mt-2">Tel: {selectedOrder.address.phone}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
